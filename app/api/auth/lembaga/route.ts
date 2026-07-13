import { NextResponse } from "next/server"
import { verifyAccessCode, setSessionCookie, clearSessionCookie } from "@/lib/lembaga-auth"

export async function POST(req: Request) {
  try {
    const { code } = await req.json()
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Kode akses wajib diisi" }, { status: 400 })
    }
    const session = await verifyAccessCode(code)
    if (!session) {
      return NextResponse.json({ error: "Kode akses tidak valid" }, { status: 401 })
    }
    await setSessionCookie(session)
    return NextResponse.json({ ok: true, session })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE() {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
