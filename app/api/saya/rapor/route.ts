import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEmployeeSession } from "@/lib/lembaga-auth"

export const dynamic = "force-dynamic"

/**
 * Menandai rapor sudah dibaca, sekaligus menyimpan tanggapan karyawan.
 *
 * Inilah yang mengubah penilaian bulanan dari kewajiban administratif menjadi
 * percakapan: atasan bisa melihat bahwa rapornya sampai, dan apa jawabannya.
 */
export async function PATCH(req: Request) {
  const emp = await getEmployeeSession()
  if (!emp) return NextResponse.json({ error: "Tidak punya akses" }, { status: 401 })

  const { periodId, tanggapan } = (await req.json()) as {
    periodId?: string; tanggapan?: string | null
  }
  if (!periodId) return NextResponse.json({ error: "Periode wajib diisi" }, { status: 400 })

  const hasil = await prisma.periodResult.findUnique({
    where: { periodId_employeeId: { periodId, employeeId: emp.employeeId } },
  })
  if (!hasil) return NextResponse.json({ error: "Rapor tidak ditemukan" }, { status: 404 })

  const updated = await prisma.periodResult.update({
    where: { id: hasil.id },
    data: {
      readAt: hasil.readAt ?? new Date(),
      tanggapan: typeof tanggapan === "string" ? tanggapan.trim() || null : hasil.tanggapan,
    },
  })

  return NextResponse.json({ ok: true, readAt: updated.readAt, tanggapan: updated.tanggapan })
}
