/**
 * Menggabungkan beberapa baris Account yang sebenarnya milik satu orang.
 *
 * Satu orang bisa memegang jabatan di lebih dari satu lembaga — Kamal
 * supervisor IYSA sekaligus CEO ICGI, Eki koordinator RnD di IYSA sekaligus
 * Project Manager di IYORA. Yang menyatukannya adalah `Account`: pemilih
 * lembaga di navigasi baru muncul kalau satu akun memegang lebih dari satu
 * lembaga (lihat LembagaSwitcher di components/navbar.tsx, yang membaca
 * lembagaList dari /api/me).
 *
 * Kalau jabatan-jabatan itu tersangkut di akun yang berbeda, orangnya
 * terpaksa keluar-masuk dengan dua kode — persis keadaan yang dulu ingin
 * dihilangkan.
 *
 * Akun bernama sama digabungkan sendiri oleh script ini. Yang TIDAK bisa
 * disimpulkan dari data adalah nama yang berbeda untuk orang yang sama —
 * "Eki" dan "Eki Iman" adalah satu orang, tapi tidak ada di basis data yang
 * menyatakannya. Karena itu daftarnya ditulis tangan di SATU_ORANG.
 *
 * Aman dijalankan berulang. Secara bawaan hanya melaporkan; menambah
 * --terapkan barulah mengubah data.
 *
 *   npx tsx prisma/gabungkan-akun-satu-orang.ts             # lihat rencananya
 *   npx tsx prisma/gabungkan-akun-satu-orang.ts --terapkan  # kerjakan
 */
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: process.env.ENVFILE ?? path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

/**
 * Orang yang tercatat dengan nama berbeda di tiap lembaga.
 *
 * `nama` adalah nama yang dipakai setelah digabung. Itu yang tampil di
 * navigasi dan tercatat di jejak audit, karena sesi membaca nama dari akun
 * (lihat getSession di lib/lembaga-auth.ts) — sementara "dinilai oleh ..." di
 * dashboard tetap memakai nama per jabatan, jadi tidak ada yang hilang.
 */
const SATU_ORANG: { nama: string; alias: string[] }[] = [
  // Dikonfirmasi pemilik sistem, 30 September 2026.
  { nama: "Eki Iman", alias: ["Eki", "Eki Iman"] },
]

const TERAPKAN = process.argv.includes("--terapkan")

type AkunRingkas = {
  id: string
  name: string
  isSuperadmin: boolean
  createdAt: Date
  evaluators: { id: string; lembaga: string; role: string }[]
}

function kunci(nama: string): string {
  return nama.trim().toLowerCase()
}

/**
 * Yang bertahan adalah akun dengan jabatan terbanyak; bila seri, yang paling
 * tua. Akun tertua cenderung yang kode aksesnya sudah beredar.
 */
function pilihYangBertahan(daftar: AkunRingkas[]): AkunRingkas {
  return [...daftar].sort(
    (a, b) =>
      b.evaluators.length - a.evaluators.length ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  )[0]
}

async function gabungkan(daftar: AkunRingkas[], namaAkhir: string): Promise<boolean> {
  const bertahan = pilihYangBertahan(daftar)
  const dilebur = daftar.filter((a) => a.id !== bertahan.id)

  const lembagaSemula = [...new Set(bertahan.evaluators.map((e) => e.lembaga))]
  const lembagaAkhir = [...new Set(daftar.flatMap((a) => a.evaluators.map((e) => e.lembaga)))]
  const perluGantiNama = bertahan.name !== namaAkhir

  if (dilebur.length === 0 && !perluGantiNama) return false

  console.log(`\n▸ ${namaAkhir}`)
  console.log(`    bertahan : ${bertahan.name} (…${bertahan.id.slice(-8)})`)
  for (const a of dilebur) {
    const j = a.evaluators.map((e) => `${e.lembaga}/${e.role}`).join(", ")
    console.log(`    dilebur  : ${a.name} (…${a.id.slice(-8)}) → ${j || "tanpa jabatan"}`)
  }
  if (perluGantiNama) console.log(`    nama     : "${bertahan.name}" → "${namaAkhir}"`)
  console.log(`    lembaga  : ${lembagaSemula.join(", ") || "—"} → ${lembagaAkhir.join(", ")}`)
  console.log(`    dropdown : ${lembagaAkhir.length > 1 ? "AKTIF" : "tidak (hanya satu lembaga)"}`)

  if (!TERAPKAN) return true

  // Jabatan dipindahkan LEBIH DULU. Relasi Evaluator→Account memakai
  // onDelete: SetNull, jadi menghapus akun sebelum memindahkan jabatannya
  // akan membuat jabatan itu kehilangan induk tanpa peringatan apa pun.
  for (const a of dilebur) {
    await prisma.evaluator.updateMany({
      where: { accountId: a.id },
      data: { accountId: bertahan.id },
    })
  }

  if (perluGantiNama) {
    await prisma.account.update({ where: { id: bertahan.id }, data: { name: namaAkhir } })
  }

  for (const a of dilebur) {
    const sisa = await prisma.evaluator.count({ where: { accountId: a.id } })
    if (sisa > 0) {
      console.log(`    ! akun …${a.id.slice(-8)} masih memegang ${sisa} jabatan — tidak dihapus`)
      continue
    }
    await prisma.account.delete({ where: { id: a.id } })
  }

  // Menggabungkan akun mengubah siapa bisa membuka apa — harus ada jejaknya.
  const { catatAudit } = await import("../lib/audit")
  await catatAudit({
    actorId: "sistem",
    actorName: "Sistem",
    action: "akun.gabung",
    target: bertahan.id,
    lembaga: lembagaAkhir[0] ?? null,
    detail:
      `Akun ${namaAkhir} digabung dari ${daftar.length} akun ` +
      `(${daftar.map((a) => a.name).join(" + ")}); lembaga: ${lembagaAkhir.join(", ")}`,
  })

  return true
}

async function main() {
  console.log("\nPenggabungan akun satu orang")
  console.log("─".repeat(66))
  console.log(TERAPKAN ? "MODE: menerapkan perubahan" : "MODE: hanya melaporkan (tambahkan --terapkan)")

  const semua: AkunRingkas[] = await prisma.account.findMany({
    select: {
      id: true, name: true, isSuperadmin: true, createdAt: true,
      evaluators: { select: { id: true, lembaga: true, role: true } },
    },
  })

  // Kelompok yang ditulis tangan lebih dulu, supaya nama berbeda untuk orang
  // yang sama tidak keburu tergabung sebagai "nama sama" saja.
  const sudahDipakai = new Set<string>()
  const kelompok: { nama: string; daftar: AkunRingkas[] }[] = []

  for (const orang of SATU_ORANG) {
    const set = new Set(orang.alias.map(kunci))
    const cocok = semua.filter((a) => set.has(kunci(a.name)) && !sudahDipakai.has(a.id))
    if (cocok.length === 0) continue
    cocok.forEach((a) => sudahDipakai.add(a.id))
    kelompok.push({ nama: orang.nama, daftar: cocok })
  }

  // Jaring pengaman umum: akun dengan nama yang persis sama.
  const perNama = new Map<string, AkunRingkas[]>()
  for (const a of semua) {
    if (sudahDipakai.has(a.id)) continue
    const k = kunci(a.name)
    if (!perNama.has(k)) perNama.set(k, [])
    perNama.get(k)!.push(a)
  }
  for (const daftar of perNama.values()) {
    if (daftar.length > 1) kelompok.push({ nama: daftar[0].name, daftar })
  }

  let berubah = 0
  for (const k of kelompok) {
    // Akun superadmin tidak pernah ikut dilebur — wewenangnya berbeda jenis,
    // dan menggabungkannya diam-diam adalah perubahan hak akses.
    if (k.daftar.some((a) => a.isSuperadmin)) {
      console.log(`\n▸ ${k.nama}\n    dilewati: ada akun superadmin di kelompok ini`)
      continue
    }
    if (await gabungkan(k.daftar, k.nama)) berubah++
  }

  if (berubah === 0) {
    console.log("\n✓ Tidak ada yang perlu digabungkan — semua sudah rapi.")
  } else if (TERAPKAN) {
    console.log(`\n✓ ${berubah} kelompok digabungkan.`)
  } else {
    console.log(`\n${berubah} kelompok akan digabungkan. Jalankan ulang dengan --terapkan.`)
  }

  // Gambaran akhir, supaya hasilnya bisa diperiksa tanpa query terpisah.
  console.log("\nKeadaan setelah ini")
  console.log("─".repeat(66))
  const akhir = await prisma.account.findMany({
    select: { name: true, evaluators: { select: { lembaga: true, role: true } } },
    orderBy: { name: "asc" },
  })
  for (const a of akhir) {
    const lembaga = [...new Set(a.evaluators.map((e) => e.lembaga))]
    if (lembaga.length === 0) continue
    const tanda = lembaga.length > 1 || lembaga[0] === "all" ? "  ← pemilih lembaga aktif" : ""
    console.log(`  ${a.name.padEnd(26)} ${lembaga.join(", ").padEnd(16)}${tanda}`)
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("\n✗ Gagal:", e)
  await prisma.$disconnect()
  process.exit(1)
})
