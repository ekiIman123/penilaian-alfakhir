/**
 * Migrasi: menambahkan dimensi periode ke penilaian.
 *
 * Sebelum: Evaluation unik per (evaluator, employee) — satu penilaian selamanya,
 *          dan penilaian bulan berikutnya menimpa bulan sebelumnya.
 * Sesudah: Evaluation unik per (periode, evaluator, employee).
 *
 * Aman dijalankan berulang (idempoten) dan tidak menghapus data apa pun.
 * Seluruh penilaian yang sudah ada dipindahkan ke satu "periode awal" per lembaga.
 *
 *   npx tsx prisma/migrate-add-periods.ts
 */
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

function periodId(lembaga: string, year: number, month: number) {
  return `${lembaga}-${year}-${String(month).padStart(2, "0")}`
}

async function run(label: string, sql: string) {
  await prisma.$executeRawUnsafe(sql)
  console.log(`  ✓ ${label}`)
}

async function main() {
  console.log("\nMigrasi periode penilaian\n" + "─".repeat(50))

  // ── 1. Tabel baru ────────────────────────────────────────────────────────
  console.log("\n1. Membuat tabel Period dan PeriodResult")

  await run(`tabel "Period"`, `
    CREATE TABLE IF NOT EXISTS "Period" (
      "id"          TEXT PRIMARY KEY,
      "lembaga"     TEXT NOT NULL,
      "year"        INTEGER NOT NULL,
      "month"       INTEGER NOT NULL,
      "label"       TEXT NOT NULL,
      "status"      TEXT NOT NULL DEFAULT 'draf',
      "opensAt"     TIMESTAMP(3) NOT NULL,
      "closesAt"    TIMESTAMP(3) NOT NULL,
      "publishedAt" TIMESTAMP(3),
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)

  await run(`indeks "Period"`, `
    CREATE UNIQUE INDEX IF NOT EXISTS "Period_lembaga_year_month_key"
      ON "Period"("lembaga", "year", "month")`)
  await run(`indeks status`, `
    CREATE INDEX IF NOT EXISTS "Period_lembaga_status_idx"
      ON "Period"("lembaga", "status")`)

  await run(`tabel "PeriodResult"`, `
    CREATE TABLE IF NOT EXISTS "PeriodResult" (
      "id"             TEXT PRIMARY KEY,
      "periodId"       TEXT NOT NULL,
      "employeeId"     TEXT NOT NULL,
      "lembaga"        TEXT NOT NULL,
      "rubricType"     TEXT NOT NULL,
      "totalScore"     DOUBLE PRECISION NOT NULL,
      "maxScore"       INTEGER NOT NULL,
      "gradeLabel"     TEXT NOT NULL,
      "sectionScores"  TEXT NOT NULL,
      "evaluatorCount" INTEGER NOT NULL,
      "finalCatatan"   TEXT,
      "publishedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)

  await run(`indeks "PeriodResult"`, `
    CREATE UNIQUE INDEX IF NOT EXISTS "PeriodResult_periodId_employeeId_key"
      ON "PeriodResult"("periodId", "employeeId")`)
  await run(`indeks karyawan`, `
    CREATE INDEX IF NOT EXISTS "PeriodResult_employeeId_idx"
      ON "PeriodResult"("employeeId")`)

  // ── 2. Kolom baru di Evaluation (nullable dulu) ──────────────────────────
  console.log("\n2. Menambah kolom di Evaluation")
  await run(`kolom "periodId"`,    `ALTER TABLE "Evaluation" ADD COLUMN IF NOT EXISTS "periodId" TEXT`)
  await run(`kolom "status"`,      `ALTER TABLE "Evaluation" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draf'`)
  await run(`kolom "submittedAt"`, `ALTER TABLE "Evaluation" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3)`)

  // ── 3. Periode awal per lembaga ──────────────────────────────────────────
  console.log("\n3. Membuat periode awal untuk data yang sudah ada")

  const orphans = await prisma.$queryRawUnsafe<{ lembaga: string; jumlah: bigint }[]>(
    `SELECT "lembaga", COUNT(*) AS "jumlah" FROM "Evaluation" WHERE "periodId" IS NULL GROUP BY "lembaga"`,
  )

  if (orphans.length === 0) {
    console.log("  · tidak ada penilaian tanpa periode — dilewati")
  } else {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    for (const { lembaga, jumlah } of orphans) {
      const id = periodId(lembaga, year, month)
      const label = `${BULAN[month - 1]} ${year}`

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Period" ("id","lembaga","year","month","label","status","opensAt","closesAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'dibuka',$6,$7,CURRENT_TIMESTAMP)
         ON CONFLICT ("id") DO NOTHING`,
        id, lembaga, year, month, label,
        new Date(year, month - 1, 1),
        new Date(year, month, 0, 23, 59, 59),
      )

      // Penilaian lama dianggap sudah final, bukan draf.
      await prisma.$executeRawUnsafe(
        `UPDATE "Evaluation"
            SET "periodId" = $1,
                "status" = 'terkirim',
                "submittedAt" = COALESCE("submittedAt", "updatedAt")
          WHERE "periodId" IS NULL AND "lembaga" = $2`,
        id, lembaga,
      )
      console.log(`  ✓ ${lembaga.padEnd(9)} → ${id}  (${jumlah} penilaian dipindahkan)`)
    }
  }

  // ── 4. Kunci unik baru ───────────────────────────────────────────────────
  console.log("\n4. Mengganti kunci unik")

  const stillNull = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*) AS n FROM "Evaluation" WHERE "periodId" IS NULL`,
  )
  if (Number(stillNull[0].n) > 0) {
    throw new Error(`Masih ada ${stillNull[0].n} penilaian tanpa periodId — migrasi dibatalkan.`)
  }

  await run(`periodId wajib diisi`, `ALTER TABLE "Evaluation" ALTER COLUMN "periodId" SET NOT NULL`)
  await run(`lepas kunci lama`,     `DROP INDEX IF EXISTS "Evaluation_evaluatorId_employeeId_key"`)
  await run(`pasang kunci baru`, `
    CREATE UNIQUE INDEX IF NOT EXISTS "Evaluation_periodId_evaluatorId_employeeId_key"
      ON "Evaluation"("periodId", "evaluatorId", "employeeId")`)
  await run(`indeks pencarian`, `
    CREATE INDEX IF NOT EXISTS "Evaluation_periodId_employeeId_idx"
      ON "Evaluation"("periodId", "employeeId")`)
  await run(`indeks progres`, `
    CREATE INDEX IF NOT EXISTS "Evaluation_periodId_evaluatorId_status_idx"
      ON "Evaluation"("periodId", "evaluatorId", "status")`)

  // ── 5. Relasi ────────────────────────────────────────────────────────────
  console.log("\n5. Memasang relasi")
  await run(`Evaluation → Period`, `
    DO $$ BEGIN
      ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_periodId_fkey"
        FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run(`PeriodResult → Period`, `
    DO $$ BEGIN
      ALTER TABLE "PeriodResult" ADD CONSTRAINT "PeriodResult_periodId_fkey"
        FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run(`PeriodResult → Employee`, `
    DO $$ BEGIN
      ALTER TABLE "PeriodResult" ADD CONSTRAINT "PeriodResult_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`)

  // ── Ringkasan ────────────────────────────────────────────────────────────
  const periods = await prisma.$queryRawUnsafe<{ id: string; status: string; n: bigint }[]>(
    `SELECT p."id", p."status", COUNT(e."id") AS n
       FROM "Period" p LEFT JOIN "Evaluation" e ON e."periodId" = p."id"
      GROUP BY p."id", p."status" ORDER BY p."id"`,
  )
  console.log("\n" + "─".repeat(50) + "\nSelesai. Periode yang ada sekarang:\n")
  for (const p of periods) {
    console.log(`  ${p.id.padEnd(18)} ${p.status.padEnd(9)} ${p.n} penilaian`)
  }
  console.log()
}

main()
  .catch((e) => { console.error("\nMigrasi gagal:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
