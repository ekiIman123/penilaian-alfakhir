import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { jagaMasuk } from "@/lib/api-guard"

export async function POST(req: Request) {
  const jaga = await jagaMasuk()
  if (!jaga.ok) return jaga.response

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
  const jaga = await jagaMasuk()
  if (!jaga.ok) return jaga.response

  const evaluators = await prisma.evaluator.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(evaluators)
}
