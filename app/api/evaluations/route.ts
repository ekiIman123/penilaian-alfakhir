import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const evaluatorId = searchParams.get("evaluatorId")
  const teacherId = searchParams.get("teacherId")

  if (!evaluatorId || !teacherId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { evaluatorId_teacherId: { evaluatorId, teacherId } },
  })

  if (!evaluation) return NextResponse.json(null)

  return NextResponse.json({
    scores: JSON.parse(evaluation.scores as string),
    catatan: evaluation.catatan,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { evaluatorId, teacherId, scores, catatan } = body

    if (!evaluatorId || !teacherId || !scores) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await prisma.evaluation.upsert({
      where: { evaluatorId_teacherId: { evaluatorId, teacherId } },
      update: { scores: JSON.stringify(scores), catatan: catatan ?? null },
      create: { evaluatorId, teacherId, scores: JSON.stringify(scores), catatan: catatan ?? null },
      include: { evaluator: true, teacher: true },
    })

    revalidatePath("/")
    return NextResponse.json(result, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
