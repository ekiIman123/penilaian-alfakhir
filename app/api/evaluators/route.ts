import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })
  try {
    const evaluator = await prisma.evaluator.create({ data: { name: name.trim() } })
    return NextResponse.json(evaluator, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Name already exists" }, { status: 409 })
  }
}

export async function GET() {
  const evaluators = await prisma.evaluator.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(evaluators)
}
