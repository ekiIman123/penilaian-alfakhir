import { prisma } from "@/lib/prisma"
import { jagaLembaga, jagaPengaturan } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/evaluators/[evaluatorId]">,
) {
  const { lembagaSlug, evaluatorId } = await ctx.params
  const jaga = await jagaPengaturan(lembagaSlug)
  if (!jaga.ok) return jaga.response

  const existing = await prisma.evaluator.findFirst({ where: { id: evaluatorId, lembaga: lembagaSlug } })
  if (!existing) return new Response("Not found", { status: 404 })

  const { name, role, divisi, accessCode, phone } = (await req.json()) as {
    name?: string; role?: string; divisi?: string; accessCode?: string; phone?: string
  }

  try {
    const updated = await prisma.evaluator.update({
      where: { id: evaluatorId },
      data: {
        name: name?.trim() || existing.name,
        role: role?.trim() || existing.role,
        divisi: divisi !== undefined ? (divisi.trim() || null) : existing.divisi,
        accessCode: accessCode !== undefined ? (accessCode.trim() || null) : existing.accessCode,
        phone: phone !== undefined ? (phone.trim() || null) : existing.phone,
      },
    })
    return Response.json(updated)
  } catch (e: any) {
    if (e.code === "P2002") return new Response("Nama atau kode akses sudah digunakan", { status: 409 })
    throw e
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/evaluators/[evaluatorId]">,
) {
  const { lembagaSlug, evaluatorId } = await ctx.params
  const jaga = await jagaPengaturan(lembagaSlug)
  if (!jaga.ok) return jaga.response

  const existing = await prisma.evaluator.findFirst({ where: { id: evaluatorId, lembaga: lembagaSlug } })
  if (!existing) return new Response("Not found", { status: 404 })
  await prisma.evaluator.delete({ where: { id: evaluatorId } })
  return new Response(null, { status: 204 })
}
