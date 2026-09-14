import { NextResponse } from "next/server"
import { getAccountSession, getEmployeeSession } from "@/lib/lembaga-auth"
import { LEMBAGA_SLUGS } from "@/lib/lembaga"

export const dynamic = "force-dynamic"

/**
 * Ringkasan identitas untuk navigasi: siapa yang masuk dan lembaga mana saja
 * yang boleh dibuka. Dipakai agar pemilih lembaga hanya menampilkan yang
 * benar-benar dipegang orang ini — bukan ketiganya untuk semua orang.
 */
export async function GET() {
  const akun = await getAccountSession()
  if (akun) {
    return NextResponse.json({
      jenis: "penilai",
      name: akun.name,
      isSuperadmin: akun.isSuperadmin,
      lembagaList: akun.isSuperadmin ? LEMBAGA_SLUGS : [...new Set(akun.hats.map((h) => h.lembaga))],
      hats: akun.hats.map((h) => ({ lembaga: h.lembaga, role: h.role })),
    })
  }

  const emp = await getEmployeeSession()
  if (emp) {
    return NextResponse.json({
      jenis: "karyawan",
      name: emp.name,
      lembagaList: [emp.lembaga],
      hats: [],
    })
  }

  return NextResponse.json({ jenis: null, lembagaList: [], hats: [] })
}
