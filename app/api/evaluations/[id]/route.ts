import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(_req: Request, ctx: RouteContext<"/api/evaluations/[id]">) {
  const { id } = await ctx.params
  try {
    await prisma.evaluation.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
