import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees/[employeeId]">,
) {
  const { lembagaSlug, employeeId } = await ctx.params
  const existing = await prisma.employee.findFirst({ where: { id: employeeId, lembaga: lembagaSlug } })
  if (!existing) return new Response("Not found", { status: 404 })

  const { name, role, divisi } = (await req.json()) as {
    name?: string; role?: string; divisi?: string
  }

  try {
    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        name: name?.trim() || existing.name,
        role: role?.trim() || existing.role,
        divisi: divisi !== undefined ? (divisi.trim() || null) : existing.divisi,
      },
    })
    return Response.json(updated)
  } catch (e: any) {
    if (e.code === "P2002") return new Response("Nama sudah ada untuk lembaga ini", { status: 409 })
    throw e
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees/[employeeId]">,
) {
  const { lembagaSlug, employeeId } = await ctx.params
  const existing = await prisma.employee.findFirst({ where: { id: employeeId, lembaga: lembagaSlug } })
  if (!existing) return new Response("Not found", { status: 404 })
  await prisma.employee.delete({ where: { id: employeeId } })
  return new Response(null, { status: 204 })
}
