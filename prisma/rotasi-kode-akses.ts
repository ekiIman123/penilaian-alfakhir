/**
 * Mengganti seluruh kode akses.
 *
 * Kode lama (KOR-ZAI, SUP-KML, MGT-DENI, dan seterusnya) tertulis apa adanya di
 * prisma/seed-new-lembaga.ts pada repositori yang berstatus publik sejak
 * 21 Juni 2026. Selama repositori itu publik, siapa pun bisa membacanya. Kode
 * tersebut harus dianggap bocor seluruhnya dan diganti.
 *
 *   npx tsx prisma/rotasi-kode-akses.ts              → pratinjau
 *   npx tsx prisma/rotasi-kode-akses.ts --terapkan   → mengganti kode
 *
 * Setelah dijalankan, bagikan kode baru ke masing-masing orang lewat jalur
 * pribadi. Jangan menuliskannya kembali ke dalam kode sumber.
 */
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { randomInt } from "node:crypto"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const TERAPKAN = process.argv.includes("--terapkan")

/**
 * Abjad tanpa karakter yang mudah tertukar saat dibacakan atau diketik ulang:
 * 0/O, 1/I/L, 5/S, 8/B. Penting karena kode ini dibagikan lewat pesan dan
 * kadang didiktekan.
 */
const ABJAD = "ACDEFGHJKMNPQRTUVWXY23467"

function kodeBaru(awalan: string, panjang = 8): string {
  let s = ""
  for (let i = 0; i < panjang; i++) s += ABJAD[randomInt(ABJAD.length)]
  return `${awalan}-${s.slice(0, 4)}-${s.slice(4)}`
}

function awalanUntuk(lembaga: string): string {
  const m: Record<string, string> = { iysa: "IY", icgi: "IC", iyora: "IO", all: "MG", alfakhir: "AF" }
  return m[lembaga] ?? "XX"
}

async function main() {
  console.log(
    TERAPKAN
      ? "\n⚠  MODE TERAPKAN — kode akses akan diganti. Kode lama langsung tidak berlaku.\n"
      : "\n◇  MODE PRATINJAU — tidak ada yang diubah. Tambahkan --terapkan untuk menjalankan.\n"
  )

  const dipakai = new Set<string>()
  const baris: { jenis: string; nama: string; lembaga: string; peran: string; lama: string; baru: string }[] = []

  function buatUnik(awalan: string): string {
    let k = kodeBaru(awalan)
    while (dipakai.has(k)) k = kodeBaru(awalan)
    dipakai.add(k)
    return k
  }

  // ── Penilai ─────────────────────────────────────────────────────────────
  const penilai = await prisma.evaluator.findMany({
    where: { accessCode: { not: null } },
    orderBy: [{ lembaga: "asc" }, { name: "asc" }],
    select: { id: true, name: true, lembaga: true, role: true, accessCode: true },
  })

  for (const p of penilai) {
    const baru = buatUnik(awalanUntuk(p.lembaga))
    baris.push({
      jenis: "Penilai", nama: p.name, lembaga: p.lembaga, peran: p.role,
      lama: p.accessCode!, baru,
    })
    if (TERAPKAN) {
      await prisma.evaluator.update({ where: { id: p.id }, data: { accessCode: baru } })
    }
  }

  // ── Akun gabungan, bila migrasi identitas sudah dijalankan ──────────────
  let akun: { id: string; name: string; accessCode: string | null }[] = []
  try {
    akun = await prisma.account.findMany({
      where: { accessCode: { not: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, accessCode: true },
    })
  } catch {
    // Tabel Account belum ada — migrasi identitas belum dijalankan. Tidak apa-apa.
  }

  for (const a of akun) {
    const baru = buatUnik("MG")
    baris.push({
      jenis: "Akun", nama: a.name, lembaga: "—", peran: "gabungan",
      lama: a.accessCode!, baru,
    })
    if (TERAPKAN) {
      await prisma.account.update({ where: { id: a.id }, data: { accessCode: baru } })
    }
  }

  // ── Karyawan, bila kode rapor sudah dibuat ─────────────────────────────
  let karyawan: { id: string; name: string; lembaga: string; accessCode: string | null }[] = []
  try {
    karyawan = await prisma.employee.findMany({
      where: { accessCode: { not: null } },
      orderBy: [{ lembaga: "asc" }, { name: "asc" }],
      select: { id: true, name: true, lembaga: true, accessCode: true },
    })
  } catch {
    // Kolom accessCode pada Employee belum ada.
  }

  for (const k of karyawan) {
    const baru = buatUnik(awalanUntuk(k.lembaga))
    baris.push({
      jenis: "Karyawan", nama: k.name, lembaga: k.lembaga, peran: "rapor sendiri",
      lama: k.accessCode!, baru,
    })
    if (TERAPKAN) {
      await prisma.employee.update({ where: { id: k.id }, data: { accessCode: baru } })
    }
  }

  // ── Keluaran ────────────────────────────────────────────────────────────
  if (baris.length === 0) {
    console.log("Tidak ada kode akses untuk diganti.\n")
    return
  }

  console.log("Jenis     Nama                 Lembaga  Peran           Kode lama      Kode baru")
  console.log("─".repeat(96))
  for (const b of baris) {
    console.log(
      `${b.jenis.padEnd(9)} ${b.nama.slice(0, 20).padEnd(20)} ${b.lembaga.padEnd(8)} ` +
      `${b.peran.slice(0, 15).padEnd(15)} ${b.lama.slice(0, 14).padEnd(14)} ${b.baru}`
    )
  }
  console.log(`\n  ${baris.length} kode.`)

  if (TERAPKAN) {
    // Disimpan ke berkas supaya tidak hilang dari layar terminal. Berkas ini
    // berisi kredensial — hapus setelah kode dibagikan.
    const berkas = path.resolve(process.cwd(), "kode-akses-baru.txt")
    fs.writeFileSync(
      berkas,
      "KODE AKSES BARU — " + new Date().toISOString() + "\n" +
      "RAHASIA. Bagikan lewat jalur pribadi, lalu HAPUS berkas ini.\n" +
      "Jangan pernah menuliskannya kembali ke dalam kode sumber.\n\n" +
      baris.map((b) => `${b.jenis.padEnd(9)} ${b.nama.padEnd(22)} ${b.lembaga.padEnd(7)} ${b.baru}`).join("\n") +
      "\n",
      { mode: 0o600 },
    )
    console.log(`\n✓ Kode diganti. Daftar lengkap disimpan di:\n    ${berkas}`)
    console.log("  Berkas itu berisi kredensial — bagikan isinya, lalu hapus berkasnya.\n")
  } else {
    console.log("\n◇ Tidak ada yang diubah. Kode baru di atas hanya contoh — menjalankan")
    console.log("  dengan --terapkan akan menghasilkan kode acak yang berbeda.\n")
  }
}

main()
  .catch((e) => { console.error("\nRotasi gagal:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
