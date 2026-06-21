import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import { prisma } from "@/lib/prisma"
import { SECTIONS, getScoreGrade } from "@/lib/rubrics"
import { parseScores, calcTotal } from "@/lib/calculations"
import { ReportDocument, type ReportData } from "@/components/pdf/report-document"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteContext<"/api/reports/[teacherId]/pdf">) {
  const { teacherId } = await ctx.params

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      evaluations: {
        include: { evaluator: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  })

  if (!teacher) {
    return new Response(JSON.stringify({ error: "Teacher not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const allEvaluators = await prisma.evaluator.findMany({ orderBy: { name: "asc" } })

  const evaluations = teacher.evaluations.map((e) => ({
    evaluator: e.evaluator,
    scores: parseScores(e.scores),
    catatan: e.catatan,
    updatedAt: e.updatedAt,
  }))

  const scoreSets = evaluations.map((e) => e.scores)
  const totals = scoreSets.map(calcTotal)
  const avgTotal =
    totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null

  const grade = avgTotal != null ? getScoreGrade(avgTotal) : null

  const sections = SECTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    color: s.color,
    maxScore: s.maxScore,
    criteria: s.criteria.map((c) => ({ id: c.id, label: c.label })),
  }))

  const reportData: ReportData = {
    teacher: { name: teacher.name },
    evaluators: allEvaluators,
    evaluations,
    sections,
    avgTotal,
    grade,
    generatedAt: new Date(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(ReportDocument, { data: reportData }) as any
  const buffer = await renderToBuffer(element)

  const safeName = teacher.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")
  const year = new Date().getFullYear()

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-${safeName}-${year}.pdf"`,
    },
  })
}
