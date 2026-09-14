import { prisma } from "@/lib/prisma"
import { jagaLembaga, jagaPengaturan } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

const VALID = ["iysa", "icgi", "iyora"] as const

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees">,
) {
  const { lembagaSlug } = await ctx.params
  // Daftar karyawan adalah data pribadi orang, bukan informasi publik.
  const jaga = await jagaLembaga(lembagaSlug)
  if (!jaga.ok) return jaga.response

  const rows = await prisma.employee.findMany({
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
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees">,
) {
  const { lembagaSlug } = await ctx.params
  const jaga = await jagaPengaturan(lembagaSlug)
  if (!jaga.ok) return jaga.response

  const { name, role, divisi, accessCode, phone } = (await req.json()) as {
    name?: string; role?: string; divisi?: string; accessCode?: string; phone?: string
  }
  if (!name?.trim() || !role?.trim())
    return new Response("name dan role wajib diisi", { status: 400 })

  try {
    const row = await prisma.employee.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        divisi: divisi?.trim() || null,
        // Kode akses karyawan dipakai untuk membuka rapornya sendiri di /saya.
        accessCode: accessCode?.trim() || null,
        phone: phone?.trim() || null,
        lembaga: lembagaSlug,
      },
    })
    return Response.json(row, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return new Response("Nama sudah ada untuk lembaga ini", { status: 409 })
    throw e
  }
}
