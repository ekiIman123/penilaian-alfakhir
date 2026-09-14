import { NextResponse } from "next/server"
import { verifyAccessCode, setSessionCookie, clearSessionCookie } from "@/lib/lembaga-auth"
import { alamatIp, periksaBatas, catatPercobaan } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const { code } = await req.json()
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Kode akses wajib diisi" }, { status: 400 })
    }
    // Pembatasan tebakan. Endpoint ini satu-satunya pintu yang terbuka tanpa
    // sesi, jadi di sinilah percobaan menebak kode akan terjadi.
    const ip = alamatIp(req)
    const batas = await periksaBatas(ip)
    if (!batas.boleh) {
      return NextResponse.json(
        { error: batas.pesan },
        { status: 429, headers: { "Retry-After": String(batas.tungguDetik) } },
      )
    }

    const akun = await verifyAccessCode(code)
    if (!akun) {
      await catatPercobaan(ip, false, "penilai")
      return NextResponse.json({ error: "Kode akses tidak valid" }, { status: 401 })
    }

    await catatPercobaan(ip, true, "penilai")
    await setSessionCookie(akun)

    // Yang dikembalikan hanya yang dibutuhkan halaman masuk: nama dan daftar
    // lembaga yang bisa dibuka. Kode akses tidak pernah dikirim balik.
    return NextResponse.json({
      ok: true,
      name: akun.name,
      isSuperadmin: akun.isSuperadmin,
      lembagaList: akun.isSuperadmin ? "all" : akun.hats.map((h) => h.lembaga),
      jumlahJabatan: akun.hats.length,
      hats: akun.hats.map((h) => ({ lembaga: h.lembaga, role: h.role })),
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE() {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
