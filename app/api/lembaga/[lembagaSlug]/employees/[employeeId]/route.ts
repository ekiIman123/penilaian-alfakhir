import { prisma } from "@/lib/prisma"
import { jagaLembaga, jagaPengaturan } from "@/lib/api-guard"
import { catatAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees/[employeeId]">,
) {
  const { lembagaSlug, employeeId } = await ctx.params
  const jaga = await jagaPengaturan(lembagaSlug)
  if (!jaga.ok) return jaga.response

  const existing = await prisma.employee.findFirst({ where: { id: employeeId, lembaga: lembagaSlug } })
  if (!existing) return new Response("Not found", { status: 404 })

  const { name, role, divisi, accessCode, phone } = (await req.json()) as {
    name?: string; role?: string; divisi?: string; accessCode?: string; phone?: string
  }

  try {
    const updated = await prisma.employee.update({
      where: { id: employeeId },
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
    if (e.code === "P2002") return new Response("Nama sudah ada untuk lembaga ini", { status: 409 })
    throw e
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees/[employeeId]">,
) {
  const { lembagaSlug, employeeId } = await ctx.params

  // Menghapus karyawan ikut menghapus seluruh penilaiannya (onDelete: Cascade).
  // Tindakan ini tidak bisa dibatalkan, jadi dijaga paling ketat.
  const jaga = await jagaPengaturan(lembagaSlug)
  if (!jaga.ok) return jaga.response

  const existing = await prisma.employee.findFirst({ where: { id: employeeId, lembaga: lembagaSlug } })
  if (!existing) return new Response("Not found", { status: 404 })

  await catatAudit({
    actorId: jaga.session.evaluatorId,
    actorName: jaga.session.name,
    action: "karyawan.hapus",
    target: employeeId,
    lembaga: lembagaSlug,
    detail: `Karyawan ${existing.name} dihapus beserta seluruh penilaiannya`,
  })

  await prisma.employee.delete({ where: { id: employeeId } })
  return new Response(null, { status: 204 })
}
