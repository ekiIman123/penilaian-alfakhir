import { prisma } from "./prisma"
import { AG_SECTIONS, getNewRubricGrade } from "./rubrics"
import { calcSectionRaw, parseScores } from "./calculations"
import { rubricTypeFor } from "./lembaga-evaluatees"
import { bobotUntukPeran, rataTertimbang, porsiBobot } from "./weights"
import type { EvaluateeEmployee } from "./lembaga-evaluatees"

/** Keadaan pekerjaan penilai terhadap satu orang dalam satu periode. */
export type EvalStatus = "belum" | "draf" | "terkirim"

export interface EvalSummary {
  evaluationId: string
  evaluatorId: string
  evaluatorName: string
  status: EvalStatus
  /** Bobot penilai ini dalam rata-rata, sebagai persen dari total. */
  porsi: number
  sectionScores: (number | null)[]
  sectionMax: (number | null)[]
  totalScore: number
  maxScore: number
  catatan: string | null
  rubricType: "ae" | "ag"
  scores: Record<string, number>
}

export interface EvaluateeRowData {
  id: string
  name: string
  role: string
  divisi: string | null
  rubricType: "ae" | "ag"
  evaluated: boolean
  /** Status pekerjaan penilai yang sedang login terhadap orang ini. */
  myStatus: EvalStatus
  sectionScores: (number | null)[]
  sectionMax: (number | null)[]
  totalScore: number | null
  maxScore: number
  grade: { label: string; color: string; bg: string } | null
  catatan: string | null
  finalCatatan: string | null
  /** Berapa penilai yang sudah mengirim penilaian untuk orang ini. */
  submittedCount: number
  evaluationSummaries: EvalSummary[]
}

export async function buildDashboardRows(
  evaluatees: EvaluateeEmployee[],
  sessionEvaluatorId: string,
  periodId: string,
): Promise<EvaluateeRowData[]> {
  if (evaluatees.length === 0) return []

  const employeeIds = evaluatees.map((e) => e.id)

  const allEvaluations = await prisma.evaluation.findMany({
    where: { employeeId: { in: employeeIds }, periodId },
    select: {
      id: true, employeeId: true, evaluatorId: true,
      scores: true, catatan: true, status: true,
    },
  })

  const evaluatorIds = [...new Set(allEvaluations.map((ev) => ev.evaluatorId))]
  const evaluatorsInfo =
    evaluatorIds.length > 0
      ? await prisma.evaluator.findMany({
          where: { id: { in: evaluatorIds } },
          select: { id: true, name: true, role: true },
        })
      : []

  const evaluatorNameMap = new Map(evaluatorsInfo.map((ev) => [ev.id, ev.name]))
  evaluatorNameMap.set("superadmin", "Super Admin")

  // Bobot: dari penugasan bila ada, kalau tidak dari peran penilainya.
  const penugasan = evaluatorIds.length > 0
    ? await prisma.assignment.findMany({
        where: { evaluatorId: { in: evaluatorIds }, employeeId: { in: employeeIds } },
        select: { evaluatorId: true, employeeId: true, weight: true },
      })
    : []
  const bobotKhusus = new Map(penugasan.map((a) => [`${a.evaluatorId}:${a.employeeId}`, a.weight]))
  const peranPenilai = new Map(evaluatorsInfo.map((ev) => [ev.id, ev.role]))

  function bobot(evaluatorId: string, employeeId: string): number {
    return (
      bobotKhusus.get(`${evaluatorId}:${employeeId}`) ??
      bobotUntukPeran(peranPenilai.get(evaluatorId) ?? "")
    )
  }

  const evalsByEmployee = new Map<string, typeof allEvaluations>()
  for (const ev of allEvaluations) {
    if (!evalsByEmployee.has(ev.employeeId)) evalsByEmployee.set(ev.employeeId, [])
    evalsByEmployee.get(ev.employeeId)!.push(ev)
  }

  return evaluatees.map((e) => {
    const rubricType = rubricTypeFor(e.role)
    const maxScore = rubricType === "ae" ? 60 : 84
    const applicableSections = rubricType === "ae" ? 5 : 7

    const evals = evalsByEmployee.get(e.id) ?? []
    const myEval = evals.find((ev) => ev.evaluatorId === sessionEvaluatorId)

    // Draf masih milik penilainya sendiri — belum ikut dirata-rata untuk orang lain.
    const submitted = evals.filter((ev) => ev.status === "terkirim")

    const myStatus: EvalStatus = !myEval
      ? "belum"
      : myEval.status === "terkirim"
        ? "terkirim"
        : "draf"

    let sectionScores: (number | null)[] = Array(7).fill(null)
    let sectionMax: (number | null)[] = Array(7).fill(null)
    let totalScore: number | null = null
    let grade = null
    const catatan: string | null = myEval?.catatan ?? null

    if (submitted.length > 0) {
      // Baris utama menampilkan rata-rata TERTIMBANG dari semua penilai yang
      // sudah mengirim — atasan langsung berbobot lebih besar daripada yang
      // melihat dari jauh. Lihat lib/weights.ts.
      sectionScores = AG_SECTIONS.map((sec, i) => {
        if (i >= applicableSections) return null
        return rataTertimbang(
          submitted.map((ev) => ({
            nilai: calcSectionRaw(parseScores(ev.scores), sec.id, AG_SECTIONS),
            bobot: bobot(ev.evaluatorId, e.id),
          }))
        ) ?? 0
      })
      sectionMax = AG_SECTIONS.map((sec, i) => (i < applicableSections ? sec.maxScore : null))
      totalScore = sectionScores.slice(0, applicableSections).reduce<number>((a, b) => a + (b ?? 0), 0)
      grade = getNewRubricGrade(totalScore, rubricType)
    }

    // Yang ditampilkan rinciannya: semua yang sudah terkirim, ditambah draf milik sendiri.
    const visible = evals.filter((ev) => ev.status === "terkirim" || ev.evaluatorId === sessionEvaluatorId)

    const porsiPer = porsiBobot(
      submitted.map((ev) => ({ id: ev.evaluatorId, bobot: bobot(ev.evaluatorId, e.id) }))
    )

    const evaluationSummaries: EvalSummary[] = visible.map((ev) => {
      const scores = parseScores(ev.scores)
      const evSectionScores: (number | null)[] = AG_SECTIONS.map((sec, i) =>
        i < applicableSections ? calcSectionRaw(scores, sec.id, AG_SECTIONS) : null
      )
      const evSectionMax: (number | null)[] = AG_SECTIONS.map((sec, i) =>
        i < applicableSections ? sec.maxScore : null
      )
      const evTotal = evSectionScores
        .slice(0, applicableSections)
        .reduce<number>((a, b) => a + (b ?? 0), 0)
      return {
        evaluationId: ev.id,
        evaluatorId: ev.evaluatorId,
        evaluatorName: evaluatorNameMap.get(ev.evaluatorId) ?? "Penilai",
        status: ev.status === "terkirim" ? "terkirim" : "draf",
        porsi: porsiPer[ev.evaluatorId] ?? 0,
        sectionScores: evSectionScores,
        sectionMax: evSectionMax,
        totalScore: evTotal,
        maxScore,
        catatan: ev.catatan ?? null,
        rubricType,
        scores,
      }
    })

    return {
      id: e.id,
      name: e.name,
      role: e.role,
      divisi: e.divisi,
      rubricType,
      evaluated: myStatus === "terkirim",
      myStatus,
      sectionScores,
      sectionMax,
      totalScore,
      maxScore,
      grade,
      catatan,
      finalCatatan: e.finalCatatan ?? null,
      submittedCount: submitted.length,
      evaluationSummaries,
    }
  })
}
