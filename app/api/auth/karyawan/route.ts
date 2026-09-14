import { NextResponse } from "next/server"
import { verifyEmployeeCode, setEmployeeCookie, clearSessionCookie } from "@/lib/lembaga-auth"
import { alamatIp, periksaBatas, catatPercobaan } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const { code } = await req.json()
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Kode akses wajib diisi" }, { status: 400 })
    }
    const ip = alamatIp(req)
    const batas = await periksaBatas(ip)
    if (!batas.boleh) {
      return NextResponse.json(
        { error: batas.pesan },
        { status: 429, headers: { "Retry-After": String(batas.tungguDetik) } },
      )
    }

    const emp = await verifyEmployeeCode(code)
    if (!emp) {
      await catatPercobaan(ip, false, "karyawan")
      return NextResponse.json({ error: "Kode akses tidak valid" }, { status: 401 })
    }

    await catatPercobaan(ip, true, "karyawan")
    await setEmployeeCookie(emp)
    return NextResponse.json({ ok: true, name: emp.name, lembaga: emp.lembaga })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE() {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
