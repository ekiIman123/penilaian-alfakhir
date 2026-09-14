import type { NextConfig } from "next"

/**
 * Header keamanan HTTP.
 *
 * Tidak satu pun dari ini mencegah insiden 31 Agustus 2026 — itu murni soal
 * endpoint tanpa autentikasi. Tapi ini menutup jenis serangan lain yang belum
 * pernah diuji di aplikasi ini: penyisipan skrip, penyamaran halaman lewat
 * iframe, dan kebocoran alamat halaman internal ke situs luar.
 */
const HEADER_KEAMANAN = [
  // Memaksa HTTPS pada kunjungan berikutnya, termasuk subdomain.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Melarang browser menebak-nebak tipe berkas — sumber XSS klasik.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Melarang halaman ditanam di iframe situs lain (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Alamat halaman internal tidak ikut terkirim saat pengguna menuju situs luar.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Aplikasi ini tidak butuh kamera, mikrofon, maupun lokasi.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
]

const nextConfig: NextConfig = {
  // Dibutuhkan generator rapor PDF — keduanya tidak boleh ikut di-bundle.
  serverExternalPackages: ["@react-pdf/renderer", "jszip"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Versi Next.js tidak perlu diumumkan ke penyerang.
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: HEADER_KEAMANAN },
      {
        // Jawaban API tidak boleh tersimpan di cache mana pun: isinya data
        // pribadi dan bergantung pada siapa yang sedang masuk.
        source: "/api/:path*",
        headers: [
          ...HEADER_KEAMANAN,
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ]
  },
}

export default nextConfig
