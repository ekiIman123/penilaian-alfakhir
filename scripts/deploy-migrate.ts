/**
 * Menjalankan migrasi struktur saat proses build di Vercel.
 *
 * Tanpa ini, deploy kode baru ke basis data lama membuat seluruh halaman gagal:
 * kode baru membaca tabel Period, Account, Assignment, AuditLog, dan
 * LoginAttempt yang belum ada. Menjalankan migrasi manual sebelum deploy mudah
 * terlupa, dan akibatnya situs mati.
 *
 * Aman dijalankan berulang — seluruh migrasi memakai CREATE TABLE IF NOT EXISTS
 * dan ADD COLUMN IF NOT EXISTS, sehingga build kedua tidak mengubah apa pun.
 *
 * Hanya berjalan pada deploy produksi. Preview deployment sengaja dilewati
 * supaya cabang percobaan tidak ikut mengubah struktur basis data produksi.
 */
import { execFileSync } from "node:child_process"
import * as dotenv from "dotenv"
import * as path from "path"

// Di Vercel, DATABASE_URL adalah variabel lingkungan sungguhan. Di komputer
// pengembang ia ada di .env.local — dibaca di sini juga supaya jalur produksi
// bisa diuji secara lokal tanpa mengubah perilakunya.
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") })
dotenv.config({ path: path.resolve(__dirname, "..", ".env") })

const MIGRASI = [
  "migrate-add-periods.ts",
  "migrate-identity-and-weights.ts",
  "migrate-pembatasan-masuk.ts",
]

function main() {
  const env = process.env.VERCEL_ENV

  // Build lokal: migrasi dijalankan sendiri oleh pengembang, bukan oleh build.
  if (!process.env.VERCEL) {
    console.log("  · build lokal — migrasi dilewati")
    return
  }

  if (env !== "production") {
    console.log(`  · VERCEL_ENV="${env}" — bukan produksi, migrasi dilewati`)
    return
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      "\n✗ DATABASE_URL tidak tersedia saat build.\n" +
      "  Isi di Vercel → Settings → Environment Variables, dan pastikan\n" +
      "  tercentang untuk lingkungan Production.\n"
    )
    process.exit(1)
  }

  console.log("\nMenjalankan migrasi struktur sebelum build")
  console.log("─".repeat(44))

  for (const m of MIGRASI) {
    const berkas = path.resolve(__dirname, "..", "prisma", m)
    console.log(`\n▸ ${m}`)
    try {
      execFileSync("npx", ["tsx", berkas], { stdio: "inherit" })
    } catch {
      console.error(
        `\n✗ Migrasi ${m} gagal. Build dihentikan supaya kode baru tidak\n` +
        "  ter-deploy ke basis data yang strukturnya belum siap.\n"
      )
      process.exit(1)
    }
  }

  console.log("\n✓ Seluruh migrasi selesai.\n")
}

main()
