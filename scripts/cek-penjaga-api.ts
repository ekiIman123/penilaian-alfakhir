/**
 * Memastikan setiap endpoint API punya pemeriksaan akses.
 *
 * Insiden 31 Agustus 2026 terjadi karena sembilan endpoint pengubah data
 * berjalan tanpa pemeriksaan apa pun, dan tidak ada yang menyadarinya selama
 * berbulan-bulan. Middleware sekarang menolak lebih dulu, tapi middleware hanya
 * tahu "ada sesi yang sah" — wewenang per peran tetap harus diperiksa di route.
 *
 * Script ini membaca seluruh app/api dan gagal bila ada handler yang tidak
 * memeriksa apa pun. Dijalankan lewat `npm run cek:keamanan`, dan sebaiknya
 * ikut dijalankan di CI sebelum deploy.
 *
 *   npx tsx scripts/cek-penjaga-api.ts
 */
import * as fs from "fs"
import * as path from "path"

const AKAR = path.resolve(__dirname, "..", "app", "api")

/** Penanda bahwa sebuah berkas memang memeriksa akses. */
const PENJAGA = [
  "jagaLembaga", "jagaPengelola", "jagaPengaturan", "jagaPuncak", "jagaMasuk",
  "getSession", "getAccountSession", "getEmployeeSession",
  "CRON_SECRET",
]

/**
 * Endpoint yang memang harus terbuka. Daftarnya sengaja sama dengan yang ada di
 * middleware.ts — kalau keduanya berbeda, itu sendiri sebuah kekeliruan.
 */
const DIKECUALIKAN: Record<string, string> = {
  "auth/lembaga/route.ts":  "pintu masuk penilai — belum punya sesi",
  "auth/karyawan/route.ts": "pintu masuk karyawan — belum punya sesi",
  "logo/route.ts":          "logo tampil di navigasi sebelum masuk",
  "cron/periode/route.ts":  "dijaga CRON_SECRET, bukan sesi",
}

const METODE = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g

function telusuri(dir: string): string[] {
  const out: string[] = []
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama)
    if (fs.statSync(p).isDirectory()) out.push(...telusuri(p))
    else if (nama === "route.ts" || nama === "route.tsx") out.push(p)
  }
  return out
}

function main() {
  if (!fs.existsSync(AKAR)) {
    console.error("Folder app/api tidak ditemukan")
    process.exit(1)
  }

  const berkas = telusuri(AKAR).sort()
  const masalah: { rel: string; metode: string[] }[] = []
  let diperiksa = 0
  let dikecualikan = 0

  for (const f of berkas) {
    const rel = path.relative(AKAR, f)
    const isi = fs.readFileSync(f, "utf8")
    const metode = [...isi.matchAll(METODE)].map((m) => m[1])
    if (metode.length === 0) continue

    if (rel in DIKECUALIKAN) {
      dikecualikan++
      continue
    }

    if (PENJAGA.some((p) => isi.includes(p))) {
      diperiksa++
      continue
    }

    masalah.push({ rel, metode })
  }

  console.log("\nPemeriksaan penjaga endpoint API")
  console.log("─".repeat(64))
  console.log(`  dijaga      : ${diperiksa}`)
  console.log(`  dikecualikan: ${dikecualikan}`)
  for (const [k, v] of Object.entries(DIKECUALIKAN)) {
    console.log(`                ${k} — ${v}`)
  }

  if (masalah.length === 0) {
    console.log(`  tanpa penjaga: 0\n\n✓ Seluruh endpoint memeriksa akses.\n`)
    return
  }

  console.log(`  tanpa penjaga: ${masalah.length}\n`)
  console.log("✗ Endpoint berikut tidak memeriksa akses sama sekali:\n")
  for (const m of masalah) {
    console.log(`    ${m.rel}   [${m.metode.join(", ")}]`)
  }
  console.log(
    "\n  Tambahkan salah satu penjaga dari lib/api-guard.ts, atau — bila endpoint\n" +
    "  ini memang harus terbuka — daftarkan di DIKECUALIKAN pada script ini DAN\n" +
    "  di TANPA_SESI pada middleware.ts. Keduanya harus sama.\n"
  )
  process.exit(1)
}

main()
