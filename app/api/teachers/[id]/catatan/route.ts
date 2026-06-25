import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function PATCH(req: Request, ctx: RouteContext<"/api/teachers/[id]/catatan">) {
  const { id } = await ctx.params
  const { finalCatatan } = await req.json()

  await prisma.teacher.update({
    where: { id },
    data: { finalCatatan: finalCatatan ?? null },
  })

  revalidatePath(`/teachers/${id}`)
  return NextResponse.json({ ok: true })
}
