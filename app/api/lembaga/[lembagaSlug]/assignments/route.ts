import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/lembaga-auth"
import { isLembaga, bolehKelolaPeriode } from "@/lib/lembaga"
import { bobotUntukPeran } from "@/lib/weights"
import { catatAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"

async function penjaga(lembagaSlug: string) {
  if (!isLembaga(lembagaSlug)) return { error: NextResponse.json({ error: "Lembaga tidak dikenal" }, { status: 404 }) }
  const session = await getSession(lembagaSlug)
  if (!session) return { error: NextResponse.json({ error: "Tidak punya akses" }, { status: 401 }) }
  if (!bolehKelolaPeriode(session.role)) {
    return { error: NextResponse.json({ error: "Peran Anda tidak bisa mengatur penugasan" }, { status: 403 }) }
  }
  return { session }
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/assignments">,
) {
  const { lembagaSlug } = await ctx.params
  const jaga = await penjaga(lembagaSlug)
  if (jaga.error) return jaga.error

  const rows = await prisma.assignment.findMany({
    where: { lembaga: lembagaSlug },
    select: { id: true, evaluatorId: true, employeeId: true, weight: true, activeTo: true },
  })
  return NextResponse.json(rows)
}

/** Menambah atau memperbarui satu penugasan. */
export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/assignments">,
) {
  const { lembagaSlug } = await ctx.params
  const jaga = await penjaga(lembagaSlug)
  if (jaga.error) return jaga.error

  const { evaluatorId, employeeId, weight } = (await req.json()) as {
    evaluatorId?: string; employeeId?: string; weight?: number
  }
  if (!evaluatorId || !employeeId) {
    return NextResponse.json({ error: "Penilai dan karyawan wajib diisi" }, { status: 400 })
  }

  const [ev, emp] = await Promise.all([
    prisma.evaluator.findUnique({ where: { id: evaluatorId }, select: { id: true, name: true, role: true } }),
    prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, name: true, lembaga: true } }),
  ])
  if (!ev || !emp) return NextResponse.json({ error: "Penilai atau karyawan tidak ditemukan" }, { status: 404 })
  if (emp.lembaga !== lembagaSlug) {
    return NextResponse.json({ error: "Karyawan ini bukan milik lembaga tersebut" }, { status: 400 })
  }
  if (ev.name.trim().toLowerCase() === emp.name.trim().toLowerCase()) {
    return NextResponse.json({ error: "Seseorang tidak bisa menilai dirinya sendiri" }, { status: 400 })
  }

  const bobot = typeof weight === "number" && weight > 0 && weight <= 5
    ? weight
    : bobotUntukPeran(ev.role)

  const row = await prisma.assignment.upsert({
    where: { evaluatorId_employeeId: { evaluatorId, employeeId } },
    update: { weight: bobot, activeTo: null, lembaga: lembagaSlug },
    create: { evaluatorId, employeeId, lembaga: lembagaSlug, weight: bobot },
  })

  await catatAudit({
    actorId: jaga.session!.evaluatorId,
    actorName: jaga.session!.name,
    action: "penugasan.ubah",
    target: `${evaluatorId}:${employeeId}`,
    lembaga: lembagaSlug,
    detail: `${ev.name} menilai ${emp.name} (bobot ${bobot})`,
  })

  return NextResponse.json(row)
}

export async function DELETE(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/assignments">,
) {
  const { lembagaSlug } = await ctx.params
  const jaga = await penjaga(lembagaSlug)
  if (jaga.error) return jaga.error

  const { evaluatorId, employeeId } = (await req.json()) as {
    evaluatorId?: string; employeeId?: string
  }
  if (!evaluatorId || !employeeId) {
    return NextResponse.json({ error: "Penilai dan karyawan wajib diisi" }, { status: 400 })
  }

  const ada = await prisma.assignment.findUnique({
    where: { evaluatorId_employeeId: { evaluatorId, employeeId } },
    include: {
      evaluator: { select: { name: true } },
      employee: { select: { name: true } },
    },
  })
  if (!ada) return NextResponse.json({ ok: true })

  // Penilaian yang sudah masuk tidak ikut terhapus — penugasan hanya mengatur
  // siapa yang boleh menilai ke depan, bukan menghapus riwayat.
  await prisma.assignment.delete({ where: { id: ada.id } })

  await catatAudit({
    actorId: jaga.session!.evaluatorId,
    actorName: jaga.session!.name,
    action: "penugasan.hapus",
    target: `${evaluatorId}:${employeeId}`,
    lembaga: lembagaSlug,
    detail: `${ada.evaluator.name} tidak lagi menilai ${ada.employee.name}`,
  })

  return NextResponse.json({ ok: true })
}
