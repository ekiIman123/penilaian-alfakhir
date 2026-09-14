import { getEmployeeSession } from "@/lib/lembaga-auth"
import { prisma } from "@/lib/prisma"
import { AG_SECTIONS, getNewRubricGrade } from "@/lib/rubrics"
import { rubricTypeFor } from "@/lib/lembaga-evaluatees"
import { shortLabel } from "@/lib/period-format"
import { ROLE_LABEL } from "@/lib/lembaga"
import { RaporSaya, type RaporBulan } from "@/components/saya/RaporSaya"
import { MasukKaryawan } from "@/components/saya/MasukKaryawan"

export const dynamic = "force-dynamic"

export default async function SayaPage() {
  const emp = await getEmployeeSession()
  if (!emp) return <MasukKaryawan />

  // Hanya rapor yang sudah diterbitkan. Penilaian yang masih berjalan tidak
  // ditampilkan — angkanya belum final dan belum melewati kalibrasi.
  const hasil = await prisma.periodResult.findMany({
    where: { employeeId: emp.employeeId },
    include: { period: { select: { label: true, year: true, month: true } } },
    orderBy: { publishedAt: "asc" },
  })

  const rubricType = rubricTypeFor(emp.role)
  const applicable = rubricType === "ae" ? 5 : 7

  const rapor: RaporBulan[] = hasil.map((h) => {
    let aspekNilai: number[] = []
    try {
      const p = JSON.parse(h.sectionScores)
      if (Array.isArray(p)) aspekNilai = p.map(Number)
    } catch { /* rapor lama tanpa rincian aspek */ }

    const grade = getNewRubricGrade(h.totalScore, h.rubricType === "ag" ? "ag" : "ae")

    return {
      periodId: h.periodId,
      label: h.period.label,
      pendek: shortLabel(h.period.year, h.period.month),
      persen: (h.totalScore / h.maxScore) * 100,
      total: h.totalScore,
      maks: h.maxScore,
      gradeLabel: h.gradeLabel || grade.label,
      gradeColor: grade.color,
      gradeBg: grade.bg,
      aspek: AG_SECTIONS.slice(0, applicable).map((s, i) => ({
        label: s.label.replace(/^[A-G]\. /, ""),
        nilai: aspekNilai[i] ?? 0,
        maks: s.maxScore,
      })),
      finalCatatan: h.finalCatatan,
      readAt: h.readAt ? h.readAt.toISOString() : null,
      tanggapan: h.tanggapan,
    }
  })

  return (
    <RaporSaya
      nama={emp.name}
      role={ROLE_LABEL[emp.role] ?? emp.role}
      divisi={emp.divisi}
      lembagaSlug={emp.lembaga}
      rapor={rapor}
    />
  )
}
