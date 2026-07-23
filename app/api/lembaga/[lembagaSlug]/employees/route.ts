import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const VALID = ["iysa", "icgi", "iyora"] as const

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees">,
) {
  const { lembagaSlug } = await ctx.params
  if (!VALID.includes(lembagaSlug as (typeof VALID)[number]))
    return new Response("Not found", { status: 404 })

  const rows = await prisma.employee.findMany({
    where: { lembaga: lembagaSlug },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true, divisi: true, createdAt: true },
  })
  return Response.json(rows)
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees">,
) {
  const { lembagaSlug } = await ctx.params
  if (!VALID.includes(lembagaSlug as (typeof VALID)[number]))
    return new Response("Not found", { status: 404 })

  const { name, role, divisi } = (await req.json()) as {
    name?: string; role?: string; divisi?: string
  }
  if (!name?.trim() || !role?.trim())
    return new Response("name dan role wajib diisi", { status: 400 })

  try {
    const row = await prisma.employee.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        divisi: divisi?.trim() || null,
        lembaga: lembagaSlug,
      },
    })
    return Response.json(row, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return new Response("Nama sudah ada untuk lembaga ini", { status: 409 })
    throw e
  }
}
