import { prisma } from "@/lib/prisma"
import { jagaLembaga, jagaPengaturan } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

const VALID = ["iysa", "icgi", "iyora"] as const

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/evaluators">,
) {
  const { lembagaSlug } = await ctx.params
  const jaga = await jagaPengaturan(lembagaSlug)
  if (!jaga.ok) return jaga.response

  if (!VALID.includes(lembagaSlug as (typeof VALID)[number]))
    return new Response("Not found", { status: 404 })

  const rows = await prisma.evaluator.findMany({
    where: { lembaga: lembagaSlug },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, role: true, divisi: true,
      accessCode: true, phone: true, createdAt: true,
    },
  })
  return Response.json(rows)
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/evaluators">,
) {
  const { lembagaSlug } = await ctx.params
  const jaga = await jagaPengaturan(lembagaSlug)
  if (!jaga.ok) return jaga.response

  if (!VALID.includes(lembagaSlug as (typeof VALID)[number]))
    return new Response("Not found", { status: 404 })

  const { name, role, divisi, accessCode, phone } = (await req.json()) as {
    name?: string; role?: string; divisi?: string; accessCode?: string; phone?: string
  }
  if (!name?.trim() || !role?.trim())
    return new Response("name dan role wajib diisi", { status: 400 })

  try {
    const row = await prisma.evaluator.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        divisi: divisi?.trim() || null,
        accessCode: accessCode?.trim() || null,
        phone: phone?.trim() || null,
        lembaga: lembagaSlug,
      },
    })
    return Response.json(row, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return new Response("Nama atau kode akses sudah digunakan", { status: 409 })
    throw e
  }
}
