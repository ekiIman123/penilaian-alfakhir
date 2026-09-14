import { NextResponse, type NextRequest } from "next/server"
import { bacaToken } from "@/lib/session-token"

/**
 * Lapisan pertahanan pertama: tolak lebih dulu, izinkan yang disebut.
 *
 * Insiden 31 Agustus 2026 terjadi bukan karena satu endpoint lupa dijaga,
 * melainkan karena pemeriksaan akses bersifat opsional per berkas. Selama
 * polanya "tambahkan penjaga bila ingat", satu berkas baru yang lupa dijaga
 * langsung menjadi lubang, dan tidak ada yang memberi tahu.
 *
 * Middleware ini membalik polanya. Seluruh /api/* wajib membawa cookie sesi
 * yang tanda tangannya sah, KECUALI yang disebut satu per satu di bawah.
 * Berkas route baru otomatis terlindungi tanpa penulisnya perlu ingat apa pun.
 *
 * Penjaga di tiap route (lib/api-guard.ts) tetap dipertahankan: middleware
 * hanya tahu "ada sesi yang sah", sedangkan wewenang per peran dan per lembaga
 * hanya bisa diperiksa di route karena butuh basis data.
 */

/**
 * Endpoint yang memang harus bisa diakses tanpa sesi.
 * Menambah baris di sini adalah keputusan sadar — itulah gunanya daftar ini.
 */
const TANPA_SESI: { pola: RegExp; alasan: string }[] = [
  { pola: /^\/api\/auth\/lembaga$/,  alasan: "pintu masuk penilai — belum punya sesi" },
  { pola: /^\/api\/auth\/karyawan$/, alasan: "pintu masuk karyawan — belum punya sesi" },
  { pola: /^\/api\/logo$/,           alasan: "logo tampil di navigasi sebelum masuk" },
  { pola: /^\/api\/cron\//,          alasan: "dijaga CRON_SECRET, bukan sesi" },
]

function bolehTanpaSesi(path: string): boolean {
  return TANPA_SESI.some((x) => x.pola.test(path))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith("/api/")) return NextResponse.next()
  if (bolehTanpaSesi(pathname)) return NextResponse.next()

  const penilai = req.cookies.get("pa-eval-session")?.value
  const karyawan = req.cookies.get("pa-emp-session")?.value

  const adaSesi =
    (await bacaToken(penilai)) !== null || (await bacaToken(karyawan)) !== null

  if (!adaSesi) {
    return NextResponse.json(
      { error: "Anda harus masuk terlebih dahulu" },
      { status: 401 },
    )
  }

  return NextResponse.next()
}

export const config = {
  // Hanya /api yang dilewatkan. Halaman biasa sudah dijaga masing-masing lewat
  // pemeriksaan sesi di server component, dan halaman masuk memang harus publik.
  matcher: ["/api/:path*"],
}
