import { prisma } from "@/lib/prisma"
import { jagaLembaga, jagaPengaturan } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees/[employeeId]/catatan">,
) {
  const { lembagaSlug, employeeId } = await ctx.params

  const jaga = await jagaLembaga(lembagaSlug)
  if (!jaga.ok) return jaga.response

  const { finalCatatan } = (await req.json()) as { finalCatatan?: string | null }

  const existing = await prisma.employee.findFirst({ where: { id: employeeId, lembaga: lembagaSlug } })
  if (!existing) return new Response("Not found", { status: 404 })

  await prisma.employee.update({
    where: { id: employeeId },
    data: { finalCatatan: finalCatatan?.trim() || null },
  })

  return Response.json({ ok: true })
}
