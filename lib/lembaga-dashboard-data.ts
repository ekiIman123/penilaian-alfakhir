import { prisma } from "./prisma"
import { AG_SECTIONS, getNewRubricGrade } from "./rubrics"
import { calcSectionRaw, parseScores } from "./calculations"
import { rubricTypeFor } from "./lembaga-evaluatees"
import type { EvaluateeEmployee } from "./lembaga-evaluatees"

export interface EvalSummary {
  evaluationId: string
  evaluatorId: string
  evaluatorName: string
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
  sectionScores: (number | null)[]
  sectionMax: (number | null)[]
  totalScore: number | null
  maxScore: number
  grade: { label: string; color: string; bg: string } | null
  catatan: string | null
  finalCatatan: string | null
  evaluationSummaries: EvalSummary[]
}

export async function buildDashboardRows(
  evaluatees: EvaluateeEmployee[],
  sessionEvaluatorId: string
): Promise<EvaluateeRowData[]> {
  if (evaluatees.length === 0) return []

  const employeeIds = evaluatees.map((e) => e.id)

  const allEvaluations = await prisma.evaluation.findMany({
    where: { employeeId: { in: employeeIds } },
    select: { id: true, employeeId: true, evaluatorId: true, scores: true, catatan: true },
  })

  const evaluatorIds = [...new Set(allEvaluations.map((ev) => ev.evaluatorId))]
  const evaluatorsInfo =
    evaluatorIds.length > 0
      ? await prisma.evaluator.findMany({
          where: { id: { in: evaluatorIds } },
          select: { id: true, name: true },
        })
      : []

  const evaluatorNameMap = new Map(evaluatorsInfo.map((ev) => [ev.id, ev.name]))
  evaluatorNameMap.set("superadmin", "Super Admin")

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

    let sectionScores: (number | null)[] = Array(7).fill(null)
    let sectionMax: (number | null)[] = Array(7).fill(null)
    let totalScore: number | null = null
    let grade = null
    let catatan: string | null = null

    if (myEval) {
      const scores = parseScores(myEval.scores)
      sectionScores = AG_SECTIONS.map((sec, i) =>
        i < applicableSections ? calcSectionRaw(scores, sec.id, AG_SECTIONS) : null
      )
      sectionMax = AG_SECTIONS.map((sec, i) =>
        i < applicableSections ? sec.maxScore : null
      )
      totalScore = sectionScores.slice(0, applicableSections).reduce<number>((a, b) => a + (b ?? 0), 0)
      grade = getNewRubricGrade(totalScore, rubricType)
      catatan = myEval.catatan ?? null
    } else if (evals.length > 0) {
      // No personal evaluation yet — show averaged scores across all evaluators
      sectionScores = AG_SECTIONS.map((sec, i) => {
        if (i >= applicableSections) return null
        const vals = evals.map((ev) => calcSectionRaw(parseScores(ev.scores), sec.id, AG_SECTIONS))
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      })
      sectionMax = AG_SECTIONS.map((sec, i) => (i < applicableSections ? sec.maxScore : null))
      totalScore = sectionScores.slice(0, applicableSections).reduce<number>((a, b) => a + (b ?? 0), 0)
      grade = getNewRubricGrade(totalScore, rubricType)
    }

    const evaluationSummaries: EvalSummary[] = evals.map((ev) => {
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
        sectionScores: evSectionScores,
        sectionMax: evSectionMax,
        totalScore: evTotal,
        maxScore,
        catatan: ev.catatan ?? null,
        rubricType,
        scores: parseScores(ev.scores),
      }
    })

    return {
      id: e.id,
      name: e.name,
      role: e.role,
      divisi: e.divisi,
      rubricType,
      evaluated: !!myEval,
      sectionScores,
      sectionMax,
      totalScore,
      maxScore,
      grade,
      catatan,
      finalCatatan: e.finalCatatan ?? null,
      evaluationSummaries,
    }
  })
}
