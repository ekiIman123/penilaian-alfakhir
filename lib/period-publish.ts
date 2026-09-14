import { prisma } from "./prisma"
import { AG_SECTIONS, getNewRubricGrade } from "./rubrics"
import { calcSectionRaw, parseScores } from "./calculations"
import { rubricTypeFor } from "./lembaga-evaluatees"
import { bobotUntukPeran, rataTertimbang } from "./weights"

/**
 * Membekukan hasil satu periode.
 *
 * Angka rapor disimpan sebagai salinan tersendiri, bukan dihitung ulang dari
 * data mentah setiap kali dibuka. Jadi kalau bulan depan seorang staff pindah
 * divisi atau koordinatornya diganti, rapor bulan ini tetap menunjukkan apa
 * yang benar-benar terjadi bulan ini.
 *
 * Hanya penilaian berstatus "terkirim" yang ikut dihitung. Penilai yang tidak
 * mengisi tidak dihitung sebagai nol — ia sekadar tidak ikut dirata-rata,
 * supaya kelalaian atasan tidak menjadi angka merah bawahannya.
 */
export async function publishPeriod(periodId: string, lembaga: string): Promise<{
  diterbitkan: number
  dilewati: number
}> {
  const employees = await prisma.employee.findMany({
    where: { lembaga },
    select: { id: true, role: true, finalCatatan: true },
  })

  const evaluations = await prisma.evaluation.findMany({
    where: { periodId, status: "terkirim" },
    select: { employeeId: true, evaluatorId: true, scores: true },
  })

  // Bobot penilai, supaya angka rapor sama persis dengan yang tampil di dashboard.
  const evaluatorIds = [...new Set(evaluations.map((e) => e.evaluatorId))]
  const [penilai, penugasan] = await Promise.all([
    prisma.evaluator.findMany({ where: { id: { in: evaluatorIds } }, select: { id: true, role: true } }),
    prisma.assignment.findMany({
      where: { evaluatorId: { in: evaluatorIds } },
      select: { evaluatorId: true, employeeId: true, weight: true },
    }),
  ])
  const peran = new Map(penilai.map((p) => [p.id, p.role]))
  const bobotKhusus = new Map(penugasan.map((a) => [`${a.evaluatorId}:${a.employeeId}`, a.weight]))
  const bobot = (evId: string, empId: string) =>
    bobotKhusus.get(`${evId}:${empId}`) ?? bobotUntukPeran(peran.get(evId) ?? "")

  const byEmployee = new Map<string, { scores: string; bobot: number }[]>()
  for (const ev of evaluations) {
    if (!byEmployee.has(ev.employeeId)) byEmployee.set(ev.employeeId, [])
    byEmployee.get(ev.employeeId)!.push({ scores: ev.scores, bobot: bobot(ev.evaluatorId, ev.employeeId) })
  }

  let diterbitkan = 0
  let dilewati = 0

  for (const emp of employees) {
    const raw = byEmployee.get(emp.id) ?? []
    if (raw.length === 0) {
      // Tidak ada penilaian yang masuk — tidak ada rapor untuk dibekukan.
      dilewati++
      continue
    }

    const rubricType = rubricTypeFor(emp.role)
    const applicable = rubricType === "ae" ? 5 : 7
    const maxScore = rubricType === "ae" ? 60 : 84
    const scoreSets = raw.map((r) => ({ scores: parseScores(r.scores), bobot: r.bobot }))

    const sectionScores = AG_SECTIONS.slice(0, applicable).map((sec) =>
      rataTertimbang(
        scoreSets.map((s) => ({
          nilai: calcSectionRaw(s.scores, sec.id, AG_SECTIONS),
          bobot: s.bobot,
        }))
      ) ?? 0
    )

    const totalScore = sectionScores.reduce((a, b) => a + b, 0)
    const grade = getNewRubricGrade(totalScore, rubricType)

    await prisma.periodResult.upsert({
      where: { periodId_employeeId: { periodId, employeeId: emp.id } },
      update: {
        rubricType, totalScore, maxScore,
        gradeLabel: grade.label,
        sectionScores: JSON.stringify(sectionScores),
        evaluatorCount: raw.length,
        finalCatatan: emp.finalCatatan,
        publishedAt: new Date(),
      },
      create: {
        periodId, employeeId: emp.id, lembaga,
        rubricType, totalScore, maxScore,
        gradeLabel: grade.label,
        sectionScores: JSON.stringify(sectionScores),
        evaluatorCount: raw.length,
        finalCatatan: emp.finalCatatan,
      },
    })
    diterbitkan++
  }

  return { diterbitkan, dilewati }
}

/** Menarik kembali rapor yang sudah diterbitkan, membuang salinan bekunya. */
export async function unpublishPeriod(periodId: string): Promise<number> {
  const { count } = await prisma.periodResult.deleteMany({ where: { periodId } })
  return count
}
