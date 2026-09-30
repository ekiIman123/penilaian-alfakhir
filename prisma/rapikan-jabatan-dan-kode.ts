/**
 * Dua hal yang saling terkait: memastikan jabatan seseorang lengkap, dan
 * memastikan orang yang memegang banyak lembaga hanya punya SATU kode akses.
 *
 * Dulu setiap baris `Evaluator` punya kode sendiri, dan `Account` punya kode
 * lagi di atasnya — semuanya berlaku, semuanya mengantar ke identitas yang
 * sama. Itu memang disengaja supaya kode lama tidak mendadak mati saat akun
 * diperkenalkan. Tapi bagi orang yang memegang dua atau tiga lembaga, hasilnya
 * tiga sampai empat kode untuk satu orang, dan tidak ada cara menebak mana
 * yang "kode saya". Sekarang mereka cukup satu: kode akunnya.
 *
 * Kode per jabatan hanya dicabut untuk yang memegang lebih dari satu lembaga.
 * Yang hanya di satu lembaga tidak disentuh — tidak ada yang membingungkan di
 * sana, dan mencabutnya berisiko mengunci orang yang terlanjur hafal kodenya.
 *
 * Aman dijalankan berulang. Bawaannya hanya melaporkan; --terapkan yang
 * mengubah data.
 *
 *   npx tsx prisma/rapikan-jabatan-dan-kode.ts
 *   npx tsx prisma/rapikan-jabatan-dan-kode.ts --terapkan
 */
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { randomInt } from "node:crypto"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: process.env.ENVFILE ?? path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const LEMBAGA_SLUGS = ["iysa", "icgi", "iyora"] as const
const TERAPKAN = process.argv.includes("--terapkan")

/**
 * Jabatan yang harus ada. `akunDari` menyebut nama jabatan yang sudah ada
 * milik orang yang sama — dari situ akunnya ditemukan, supaya jabatan baru
 * menempel ke orang yang benar dan bukan membuat akun kedua.
 *
 * Tidak diberi kode akses sendiri: orang ini sudah punya kode akun.
 */
const JABATAN_HARUS_ADA: {
  nama: string
  lembaga: string
  role: string
  divisi?: string | null
  akunDari: string
}[] = [
  // Dikonfirmasi pemilik sistem, 30 September 2026.
  { nama: "Kamal Putra", lembaga: "iyora", role: "ceo", akunDari: "Kamal Putra" },
]

const ABJAD = "ACDEFGHJKMNPQRTUVWXY23467"

function kodeBaru(awalan: string, panjang = 8): string {
  let s = ""
  for (let i = 0; i < panjang; i++) s += ABJAD[randomInt(ABJAD.length)]
  return `${awalan}-${s.slice(0, 4)}-${s.slice(4)}`
}

/** Lembaga yang benar-benar bisa dibuka — "all" dibentangkan jadi ketiganya. */
function lembagaEfektif(ev: { lembaga: string }[]): string[] {
  const out = new Set<string>()
  for (const e of ev) {
    if (e.lembaga === "all") LEMBAGA_SLUGS.forEach((l) => out.add(l))
    else out.add(e.lembaga)
  }
  return [...out]
}

async function tambahJabatan(): Promise<number> {
  console.log("\n1. Jabatan yang harus ada")
  console.log("─".repeat(66))
  let dibuat = 0

  for (const j of JABATAN_HARUS_ADA) {
    const sudah = await prisma.evaluator.findUnique({
      where: { name_lembaga: { name: j.nama, lembaga: j.lembaga } },
      select: { id: true, role: true, accountId: true },
    })
    if (sudah) {
      console.log(`  · ${j.nama} — ${j.lembaga}/${sudah.role} sudah ada`)
      continue
    }

    // Akun ditemukan lewat jabatan lain milik orang yang sama.
    const acuan = await prisma.evaluator.findFirst({
      where: { name: j.akunDari, accountId: { not: null } },
      select: { accountId: true },
    })
    if (!acuan?.accountId) {
      console.log(`  ! ${j.nama} — akun "${j.akunDari}" tidak ketemu, dilewati`)
      continue
    }

    console.log(`  + ${j.nama} — ${j.lembaga}/${j.role}  (menempel ke akun yang sudah ada)`)
    dibuat++
    if (!TERAPKAN) continue

    await prisma.evaluator.create({
      data: {
        name: j.nama,
        lembaga: j.lembaga,
        role: j.role,
        divisi: j.divisi ?? null,
        accountId: acuan.accountId,
        accessCode: null,
      },
    })
  }

  if (dibuat === 0) console.log("  (tidak ada yang perlu ditambah)")
  return dibuat
}

async function satuKodePerOrang(): Promise<number> {
  console.log("\n2. Satu kode untuk pemegang banyak lembaga")
  console.log("─".repeat(66))

  const akun = await prisma.account.findMany({
    select: {
      id: true, name: true, accessCode: true, isSuperadmin: true,
      evaluators: { select: { id: true, lembaga: true, role: true, accessCode: true } },
    },
    orderBy: { name: "asc" },
  })

  const terpakai = new Set(
    [...akun.map((a) => a.accessCode)].filter((k): k is string => !!k),
  )
  for (const e of await prisma.evaluator.findMany({ select: { accessCode: true } })) {
    if (e.accessCode) terpakai.add(e.accessCode)
  }

  let disentuh = 0

  for (const a of akun) {
    if (a.isSuperadmin) continue
    const lembaga = lembagaEfektif(a.evaluators)
    if (lembaga.length < 2) continue

    const kodeJabatan = a.evaluators.filter((e) => e.accessCode)
    const perluKodeAkun = !a.accessCode

    if (kodeJabatan.length === 0 && !perluKodeAkun) {
      console.log(`  · ${a.name.padEnd(18)} sudah satu kode`)
      continue
    }

    disentuh++
    let kodeAkhir = a.accessCode

    if (perluKodeAkun) {
      // Orang ini memegang banyak lembaga, jadi kodenya tidak boleh berciri
      // satu lembaga — awalan "MG" dipakai untuk kode lintas lembaga.
      do { kodeAkhir = kodeBaru("MG") } while (terpakai.has(kodeAkhir))
      terpakai.add(kodeAkhir)
    }

    console.log(`\n  ${a.name}  (${lembaga.join(", ")})`)
    console.log(`     kode dipakai : ${kodeAkhir}${perluKodeAkun ? "  ← BARU, harus dibagikan" : ""}`)
    for (const e of kodeJabatan) {
      console.log(`     dicabut      : ${e.accessCode}  (${e.lembaga}/${e.role})`)
    }

    if (!TERAPKAN) continue

    if (perluKodeAkun) {
      await prisma.account.update({ where: { id: a.id }, data: { accessCode: kodeAkhir } })
    }
    // Kode per jabatan dicabut SETELAH kode akun dipastikan ada — kalau
    // urutannya terbalik dan sesuatu gagal di tengah, orangnya tidak punya
    // satu pun kode yang berlaku.
    await prisma.evaluator.updateMany({
      where: { id: { in: kodeJabatan.map((e) => e.id) } },
      data: { accessCode: null },
    })
  }

  if (disentuh === 0) console.log("  (semua sudah rapi)")
  return disentuh
}

async function main() {
  console.log("\nMerapikan jabatan dan kode akses")
  console.log("─".repeat(66))
  console.log(TERAPKAN ? "MODE: menerapkan perubahan" : "MODE: hanya melaporkan (tambahkan --terapkan)")

  const a = await tambahJabatan()
  const b = await satuKodePerOrang()

  console.log("\nKeadaan akhir")
  console.log("─".repeat(66))
  const akhir = await prisma.account.findMany({
    select: {
      name: true, accessCode: true, isSuperadmin: true,
      evaluators: { select: { lembaga: true, role: true, accessCode: true } },
    },
    orderBy: { name: "asc" },
  })
  for (const x of akhir) {
    if (x.evaluators.length === 0) continue
    const lembaga = lembagaEfektif(x.evaluators)
    const jumlahKode = (x.accessCode ? 1 : 0) + x.evaluators.filter((e) => e.accessCode).length
    const jabatan = x.evaluators.map((e) => `${e.lembaga}/${e.role}`).join(", ")
    console.log(`  ${x.name.padEnd(26)} ${String(jumlahKode).padStart(2)} kode · ${lembaga.length} lembaga · ${jabatan}`)
  }

  console.log(
    TERAPKAN
      ? `\n✓ Selesai — ${a} jabatan ditambah, ${b} akun dirapikan.`
      : `\n${a} jabatan akan ditambah, ${b} akun akan dirapikan. Jalankan ulang dengan --terapkan.`,
  )
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("\n✗ Gagal:", e)
  await prisma.$disconnect()
  process.exit(1)
})
