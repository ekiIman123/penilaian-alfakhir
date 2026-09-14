import { NextResponse } from "next/server"
import { verifyAccessCode, setSessionCookie, clearSessionCookie } from "@/lib/lembaga-auth"

export async function POST(req: Request) {
  try {
    const { code } = await req.json()
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Kode akses wajib diisi" }, { status: 400 })
    }
    const akun = await verifyAccessCode(code)
    if (!akun) {
      return NextResponse.json({ error: "Kode akses tidak valid" }, { status: 401 })
    }
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
