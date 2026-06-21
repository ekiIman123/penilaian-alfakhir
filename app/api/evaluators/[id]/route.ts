import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PUT(_req: Request, ctx: RouteContext<"/api/evaluators/[id]">) {
  const { id } = await ctx.params
  const { name } = await _req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })
  try {
    const evaluator = await prisma.evaluator.update({ where: { id }, data: { name: name.trim() } })
    return NextResponse.json(evaluator)
  } catch {
    return NextResponse.json({ error: "Not found or duplicate name" }, { status: 404 })
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/evaluators/[id]">) {
  const { id } = await ctx.params
  try {
    await prisma.evaluation.deleteMany({ where: { evaluatorId: id } })
    await prisma.evaluator.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
