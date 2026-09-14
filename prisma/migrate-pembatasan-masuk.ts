/**
 * Migrasi: tabel pencatat percobaan masuk.
 *
 * Dipakai lib/rate-limit.ts untuk membatasi tebakan kode akses. Hitungannya
 * disimpan di basis data, bukan di memori, karena aplikasi berjalan di
 * lingkungan serverless — setiap permintaan bisa dilayani proses berbeda.
 *
 *   npx tsx prisma/migrate-pembatasan-masuk.ts
 *
 * Aman dijalankan berulang.
 */
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function run(label: string, sql: string) {
  await prisma.$executeRawUnsafe(sql)
  console.log(`  ✓ ${label}`)
}

async function main() {
  console.log("\nMigrasi pembatasan percobaan masuk\n" + "─".repeat(40))

  await run(`tabel "LoginAttempt"`, `
    CREATE TABLE IF NOT EXISTS "LoginAttempt" (
      "id"        TEXT PRIMARY KEY,
      "ip"        TEXT NOT NULL,
      "berhasil"  BOOLEAN NOT NULL DEFAULT false,
      "jenis"     TEXT NOT NULL DEFAULT 'penilai',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)

  await run(`indeks per alamat IP`, `
    CREATE INDEX IF NOT EXISTS "LoginAttempt_ip_createdAt_idx"
      ON "LoginAttempt"("ip", "createdAt")`)

  await run(`indeks waktu`, `
    CREATE INDEX IF NOT EXISTS "LoginAttempt_createdAt_idx"
      ON "LoginAttempt"("createdAt")`)

  const n = await prisma.loginAttempt.count()
  console.log(`\nSelesai. Percobaan tercatat saat ini: ${n}\n`)
}

main()
  .catch((e) => { console.error("\nMigrasi gagal:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
