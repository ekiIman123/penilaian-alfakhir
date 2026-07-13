import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees, rubricTypeFor } from "@/lib/lembaga-evaluatees"
import { prisma } from "@/lib/prisma"
import { AG_SECTIONS, getNewRubricGrade } from "@/lib/rubrics"
import { calcSectionRaw, parseScores } from "@/lib/calculations"
import { LembagaDashboard } from "@/components/lembaga/LembagaDashboard"

export const dynamic = "force-dynamic"

export default async function IysaDashboardPage() {
  const session = await getSession()
  const allowed = session && (session.lembaga === "iysa" || session.lembaga === "all")
  if (!allowed) redirect("/iysa")

  const evaluatees = await getEvaluatees(session!, "iysa")

  const evaluationMap = new Map(
    (await prisma.evaluation.findMany({
      where: {
        evaluatorId: session!.evaluatorId,
        employeeId: { in: evaluatees.map((e) => e.id) },
      },
      select: { employeeId: true, scores: true, catatan: true },
    })).map((ev) => [ev.employeeId, ev])
  )

  const rows = evaluatees.map((e) => {
    const rubricType = rubricTypeFor(e.role)
    const ev = evaluationMap.get(e.id)
    const maxScore = rubricType === "ae" ? 56 : 80
    const applicableSections = rubricType === "ae" ? 5 : 7

    if (!ev) {
      return {
        id: e.id, name: e.name, role: e.role, divisi: e.divisi,
        rubricType, evaluated: false,
        sectionScores: Array(7).fill(null) as (number | null)[],
        sectionMax: Array(7).fill(null) as (number | null)[],
        totalScore: null, maxScore, grade: null, catatan: null,
      }
    }

    const scores = parseScores(ev.scores)
    const sectionScores: (number | null)[] = AG_SECTIONS.map((sec, i) =>
      i < applicableSections ? calcSectionRaw(scores, sec.id, AG_SECTIONS) : null
    )
    const sectionMax: (number | null)[] = AG_SECTIONS.map((sec, i) =>
      i < applicableSections ? sec.maxScore : null
    )
    const totalScore = sectionScores.slice(0, applicableSections).reduce<number>((a, b) => a + (b ?? 0), 0)

    return {
      id: e.id, name: e.name, role: e.role, divisi: e.divisi,
      rubricType, evaluated: true,
      sectionScores, sectionMax,
      totalScore, maxScore,
      grade: getNewRubricGrade(totalScore, rubricType),
      catatan: ev.catatan ?? null,
    }
  })

  return (
    <LembagaDashboard
      lembagaSlug="iysa"
      lembagaLabel="IYSA"
      session={{ name: session!.name, role: session!.role, divisi: session!.divisi }}
      evaluatees={rows}
    />
  )
}
