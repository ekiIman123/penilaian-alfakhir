import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { SECTIONS, getScoreGrade } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw, parseScores } from "@/lib/calculations"

export async function POST(req: Request) {
  const { name, role } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const validRole = role === "staff" ? "staff" : "guru"
  try {
    const teacher = await prisma.teacher.create({ data: { name: name.trim(), role: validRole } })
    return NextResponse.json(teacher, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Name already exists" }, { status: 409 })
  }
}

export async function GET() {
  const teachers = await prisma.teacher.findMany({
    include: {
      evaluations: { include: { evaluator: true } },
    },
    orderBy: { name: "asc" },
  })

  const result = teachers.map((t) => {
    const scoreSets = t.evaluations.map((e) => parseScores(e.scores))
    const totals = scoreSets.map(calcTotal)
    const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null
    const grade = avgTotal != null ? getScoreGrade(avgTotal) : null

    const sectionAvgs = SECTIONS.map((s) => {
      const vals = scoreSets.map((sc) => calcSectionRaw(sc, s.id))
      return {
        id: s.id,
        label: s.label,
        avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
        max: s.maxScore,
      }
    })

    return {
      ...t,
      evaluations: t.evaluations.map((e) => ({
        ...e,
        scores: parseScores(e.scores),
      })),
      avgTotal,
      grade,
      sectionAvgs,
      ratedBy: t.evaluations.map((e) => e.evaluator.name),
      evaluatorCount: t.evaluations.length,
    }
  })

  return NextResponse.json(result)
}
