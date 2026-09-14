/**
 * Migrasi lanjutan: satu identitas untuk semua jabatan, penugasan sebagai data,
 * jejak audit, dan akses karyawan atas rapornya sendiri.
 *
 * Yang berubah bagi pengguna: Pak Deni yang tadinya memegang tiga kode
 * (MGT-DENI, MGT-DENI-I, MGT-DENI-O) sekarang cukup masuk sekali dengan kode
 * mana pun — ketiganya tetap berlaku — dan langsung melihat tugasnya di tiga
 * lembaga sekaligus. Tidak ada kode yang dicabut.
 *
 *   npx tsx prisma/migrate-identity-and-weights.ts
 */
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

/** Bobot baku menurut kedekatan penilai dengan pekerjaan harian orang yang dinilai. */
const BOBOT: Record<string, number> = {
  koordinator: 1.0,  // atasan langsung, melihat kerja harian
  supervisor:  0.7,
  ceo:         0.7,
  pm:          0.7,
  management:  0.5,  // melihat dari jauh, tapi melihat lintas lembaga
  founder:     0.5,
  superadmin:  0.5,
}

async function run(label: string, sql: string) {
  await prisma.$executeRawUnsafe(sql)
  console.log(`  ✓ ${label}`)
}

function kunciNama(nama: string) {
  return nama.trim().toLowerCase().replace(/\s+/g, " ")
}

async function main() {
  console.log("\nMigrasi identitas, penugasan, dan audit\n" + "─".repeat(52))

  // ── 1. Tabel baru ──────────────────────────────────────────────────────
  console.log("\n1. Membuat tabel baru")

  await run(`tabel "Account"`, `
    CREATE TABLE IF NOT EXISTS "Account" (
      "id"           TEXT PRIMARY KEY,
      "name"         TEXT NOT NULL,
      "accessCode"   TEXT,
      "isSuperadmin" BOOLEAN NOT NULL DEFAULT false,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await run(`indeks kode akun`, `
    CREATE UNIQUE INDEX IF NOT EXISTS "Account_accessCode_key" ON "Account"("accessCode")`)

  await run(`tabel "Assignment"`, `
    CREATE TABLE IF NOT EXISTS "Assignment" (
      "id"          TEXT PRIMARY KEY,
      "evaluatorId" TEXT NOT NULL,
      "employeeId"  TEXT NOT NULL,
      "lembaga"     TEXT NOT NULL,
      "weight"      DOUBLE PRECISION NOT NULL DEFAULT 1,
      "activeFrom"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "activeTo"    TIMESTAMP(3),
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await run(`indeks penugasan`, `
    CREATE UNIQUE INDEX IF NOT EXISTS "Assignment_evaluatorId_employeeId_key"
      ON "Assignment"("evaluatorId", "employeeId")`)
  await run(`indeks lembaga`, `
    CREATE INDEX IF NOT EXISTS "Assignment_lembaga_idx" ON "Assignment"("lembaga")`)

  await run(`tabel "AuditLog"`, `
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id"        TEXT PRIMARY KEY,
      "actorId"   TEXT NOT NULL,
      "actorName" TEXT NOT NULL,
      "action"    TEXT NOT NULL,
      "target"    TEXT NOT NULL,
      "lembaga"   TEXT,
      "detail"    TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await run(`indeks audit`, `
    CREATE INDEX IF NOT EXISTS "AuditLog_lembaga_createdAt_idx" ON "AuditLog"("lembaga", "createdAt")`)
  await run(`indeks sasaran`, `
    CREATE INDEX IF NOT EXISTS "AuditLog_target_idx" ON "AuditLog"("target")`)

  // ── 2. Kolom baru ──────────────────────────────────────────────────────
  console.log("\n2. Menambah kolom")
  await run(`Evaluator."accountId"`,   `ALTER TABLE "Evaluator" ADD COLUMN IF NOT EXISTS "accountId" TEXT`)
  await run(`Employee."accessCode"`,   `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "accessCode" TEXT`)
  await run(`indeks kode karyawan`, `
    CREATE UNIQUE INDEX IF NOT EXISTS "Employee_accessCode_key" ON "Employee"("accessCode")`)
  await run(`PeriodResult."readAt"`,    `ALTER TABLE "PeriodResult" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3)`)
  await run(`PeriodResult."tanggapan"`, `ALTER TABLE "PeriodResult" ADD COLUMN IF NOT EXISTS "tanggapan" TEXT`)
  await run(`indeks akun evaluator`, `
    CREATE INDEX IF NOT EXISTS "Evaluator_accountId_idx" ON "Evaluator"("accountId")`)

  // ── 3. Menyatukan identitas ────────────────────────────────────────────
  console.log("\n3. Menyatukan jabatan-jabatan menjadi satu identitas")

  const evaluators = await prisma.evaluator.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, lembaga: true, role: true,
      divisi: true, accessCode: true, accountId: true,
    },
  })

  const perOrang = new Map<string, typeof evaluators>()
  for (const ev of evaluators) {
    const k = kunciNama(ev.name)
    if (!perOrang.has(k)) perOrang.set(k, [])
    perOrang.get(k)!.push(ev)
  }

  let akunBaru = 0, akunAda = 0
  for (const [, jabatan] of perOrang) {
    if (jabatan.every((j) => j.accountId)) { akunAda++; continue }

    // Kode utama akun: kode terpendek yang dimiliki orang ini, supaya yang
    // paling mudah diingat (MGT-DENI, bukan MGT-DENI-O) jadi kode utamanya.
    const kode = jabatan
      .map((j) => j.accessCode)
      .filter((c): c is string => !!c)
      .sort((a, b) => a.length - b.length || a.localeCompare(b))[0] ?? null

    const account = await prisma.account.create({
      data: { name: jabatan[0].name, accessCode: kode },
    })
    await prisma.evaluator.updateMany({
      where: { id: { in: jabatan.map((j) => j.id) } },
      data: { accountId: account.id },
    })
    akunBaru++

    if (jabatan.length > 1) {
      const daftar = jabatan.map((j) => `${j.lembaga}/${j.role}`).join(", ")
      console.log(`  ✓ ${jabatan[0].name.padEnd(14)} ${jabatan.length} jabatan → ${daftar}`)
    }
  }
  console.log(`  akun dibuat: ${akunBaru}, sudah ada: ${akunAda}`)

  // ── 4. Penugasan dari aturan yang selama ini tertanam di kode ──────────
  console.log("\n4. Menurunkan penugasan dari aturan peran yang berlaku")

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, role: true, lembaga: true, divisi: true },
  })

  function sasaran(ev: (typeof evaluators)[number]) {
    const bukanDiriSendiri = (e: (typeof employees)[number]) =>
      kunciNama(e.name) !== kunciNama(ev.name)

    if (ev.role === "koordinator") {
      // Divisi koordinator disimpan sebagai larik JSON, mis. ["IT","RnD"].
      let divisi: string[] = []
      try {
        const p = JSON.parse(ev.divisi ?? "[]")
        if (Array.isArray(p)) divisi = p
      } catch { /* divisi bukan JSON — dianggap kosong */ }
      return employees.filter(
        (e) => e.lembaga === ev.lembaga && e.role === "staff" && e.divisi && divisi.includes(e.divisi) && bukanDiriSendiri(e),
      )
    }
    if (ev.role === "supervisor") return employees.filter((e) => e.lembaga === "iysa" && bukanDiriSendiri(e))
    if (ev.role === "ceo")        return employees.filter((e) => e.lembaga === "icgi" && bukanDiriSendiri(e))
    if (ev.role === "pm")         return employees.filter((e) => e.lembaga === "iyora" && bukanDiriSendiri(e))
    if (ev.role === "management" || ev.role === "founder") {
      // Manajemen memegang satu baris jabatan per lembaga. Penugasannya harus
      // dibatasi pada lembaga baris itu saja — kalau tidak, ketiga barisnya
      // sama-sama mendapat seluruh orang dan Pak Deni muncul tiga kali di
      // daftar progres setiap lembaga.
      return employees.filter(
        (e) =>
          bukanDiriSendiri(e) &&
          e.lembaga === ev.lembaga &&
          ((e.lembaga === "iysa" && ["supervisor", "koordinator"].includes(e.role)) ||
            (e.lembaga === "icgi" && e.role === "ceo") ||
            (e.lembaga === "iyora" && e.role === "pm")),
      )
    }
    return []
  }

  let dibuat = 0, dilewati = 0
  for (const ev of evaluators) {
    const bobot = BOBOT[ev.role] ?? 1
    for (const emp of sasaran(ev)) {
      const ada = await prisma.assignment.findUnique({
        where: { evaluatorId_employeeId: { evaluatorId: ev.id, employeeId: emp.id } },
      })
      if (ada) { dilewati++; continue }
      await prisma.assignment.create({
        data: { evaluatorId: ev.id, employeeId: emp.id, lembaga: emp.lembaga, weight: bobot },
      })
      dibuat++
    }
  }
  console.log(`  penugasan dibuat: ${dibuat}, sudah ada: ${dilewati}`)

  // ── 5. Kode akses karyawan ─────────────────────────────────────────────
  console.log("\n5. Menyiapkan kode akses karyawan untuk melihat rapornya sendiri")

  const tanpaKode = await prisma.employee.findMany({
    where: { accessCode: null, lembaga: { in: ["iysa", "icgi", "iyora"] } },
    select: { id: true, name: true, lembaga: true },
  })

  const dipakai = new Set(
    (await prisma.employee.findMany({
      where: { accessCode: { not: null } },
      select: { accessCode: true },
    })).map((e) => e.accessCode!),
  )

  let kodeDibuat = 0
  for (const emp of tanpaKode) {
    const dasar = emp.name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "KRY"
    const awalan = emp.lembaga.slice(0, 2).toUpperCase()
    let kode = `${awalan}-${dasar}`
    let n = 2
    while (dipakai.has(kode)) kode = `${awalan}-${dasar}${n++}`
    dipakai.add(kode)
    await prisma.employee.update({ where: { id: emp.id }, data: { accessCode: kode } })
    kodeDibuat++
  }
  console.log(`  kode karyawan dibuat: ${kodeDibuat}`)

  // ── 6. Relasi ──────────────────────────────────────────────────────────
  console.log("\n6. Memasang relasi")
  for (const [label, sql] of [
    ["Evaluator → Account", `ALTER TABLE "Evaluator" ADD CONSTRAINT "Evaluator_accountId_fkey"
       FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
    ["Assignment → Evaluator", `ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_evaluatorId_fkey"
       FOREIGN KEY ("evaluatorId") REFERENCES "Evaluator"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
    ["Assignment → Employee", `ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_employeeId_fkey"
       FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ] as const) {
    await run(label, `DO $$ BEGIN ${sql}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  }

  // ── Ringkasan ──────────────────────────────────────────────────────────
  const akun = await prisma.account.findMany({
    include: { evaluators: { select: { lembaga: true, role: true } } },
    orderBy: { name: "asc" },
  })
  console.log("\n" + "─".repeat(52) + "\nIdentitas sekarang:\n")
  for (const a of akun) {
    const hats = a.evaluators.map((e) => `${e.lembaga}/${e.role}`).join(", ")
    console.log(`  ${a.name.padEnd(14)} ${(a.accessCode ?? "-").padEnd(12)} ${hats}`)
  }
  console.log()
}

main()
  .catch((e) => { console.error("\nMigrasi gagal:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
