import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { jagaMasuk } from "@/lib/api-guard"

export async function PATCH(req: Request, ctx: RouteContext<"/api/teachers/[id]/catatan">) {
  const jaga = await jagaMasuk()
  if (!jaga.ok) return jaga.response

  const { id } = await ctx.params
  const { finalCatatan } = await req.json()

  await prisma.employee.update({
    where: { id },
    data: { finalCatatan: finalCatatan ?? null },
  })

  revalidatePath(`/teachers/${id}`)
  return NextResponse.json({ ok: true })
}
