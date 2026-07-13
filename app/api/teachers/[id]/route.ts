import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { SECTIONS, EVALUATOR_COLORS, getScoreGrade } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw, calcSectionPct, parseScores } from "@/lib/calculations"

export async function PUT(_req: Request, ctx: RouteContext<"/api/teachers/[id]">) {
  const { id } = await ctx.params
  const { name, role } = await _req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const data: Record<string, string> = { name: name.trim() }
  if (role === "guru" || role === "staff") data.role = role
  try {
    const teacher = await prisma.employee.update({ where: { id }, data })
    return NextResponse.json(teacher)
  } catch {
    return NextResponse.json({ error: "Not found or duplicate name" }, { status: 404 })
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/teachers/[id]">) {
  const { id } = await ctx.params
  try {
    await prisma.evaluation.deleteMany({ where: { employeeId: id } })
    await prisma.employee.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function GET(_req: Request, ctx: RouteContext<"/api/teachers/[id]">) {
  const { id } = await ctx.params

  const teacher = await prisma.employee.findUnique({
    where: { id },
    include: { evaluations: { include: { evaluator: true }, orderBy: { createdAt: "asc" } } },
  })

  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const allEvaluators = await prisma.evaluator.findMany({ orderBy: { name: "asc" } })

  const evaluationsWithScores = teacher.evaluations.map((e, i) => {
    const scores = parseScores(e.scores)
    return {
      ...e,
      scores,
      total: calcTotal(scores),
      color: EVALUATOR_COLORS[i % EVALUATOR_COLORS.length],
      sectionScores: SECTIONS.map((s) => ({
        id: s.id,
        label: s.label,
        raw: calcSectionRaw(scores, s.id),
        pct: calcSectionPct(scores, s.id),
        max: s.maxScore,
      })),
    }
  })

  const totals = evaluationsWithScores.map((e) => e.total)
  const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null
  const grade = avgTotal != null ? getScoreGrade(avgTotal) : null

  const radarData = SECTIONS.map((s) => ({
    section: s.label.length > 12 ? s.label.split(" ")[0] : s.label,
    ...Object.fromEntries(
      evaluationsWithScores.map((e) => [
        e.evaluator.name.split(",")[0],
        calcSectionPct(e.scores, s.id),
      ])
    ),
  }))

  return NextResponse.json({
    teacher,
    allEvaluators,
    evaluations: evaluationsWithScores,
    avgTotal,
    grade,
    radarData,
    ratedBy: teacher.evaluations.map((e) => e.evaluator.name),
  })
}
