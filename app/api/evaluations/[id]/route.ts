import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/lembaga-auth"
import { peranPuncak } from "@/lib/lembaga"
import { catatAudit } from "@/lib/audit"

export async function DELETE(_req: Request, ctx: RouteContext<"/api/evaluations/[id]">) {
  const { id } = await ctx.params

  const penilaian = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      employee: { select: { name: true } },
      evaluator: { select: { name: true } },
      period: { select: { label: true, status: true } },
    },
  })
  if (!penilaian) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Sesi diarahkan ke lembaga penilaian ini, supaya pemegang beberapa jabatan
  // bertindak dengan jabatan yang tepat.
  const session = await getSession(penilaian.lembaga)
  if (!session) {
    return NextResponse.json({ error: "Anda harus masuk terlebih dahulu" }, { status: 401 })
  }

  // Penilai boleh menghapus penilaiannya sendiri; selain itu hanya manajemen.
  const miliknyaSendiri = penilaian.evaluatorId === session.evaluatorId
  if (!miliknyaSendiri && !peranPuncak(session.role)) {
    return NextResponse.json(
      { error: "Anda hanya bisa menghapus penilaian atas nama sendiri" },
      { status: 403 },
    )
  }

  // Periode yang sudah ditutup atau final tidak boleh diubah lewat jalur ini.
  if (penilaian.period.status !== "dibuka") {
    return NextResponse.json(
      { error: `Periode ${penilaian.period.label} sudah ${penilaian.period.status} — penilaian tidak bisa dihapus` },
      { status: 409 },
    )
  }

  await prisma.evaluation.delete({ where: { id } })

  await catatAudit({
    actorId: session.evaluatorId,
    actorName: session.name,
    action: "penilaian.hapus",
    target: id,
    lembaga: penilaian.lembaga,
    detail: `Penilaian ${penilaian.employee.name} oleh ${penilaian.evaluator.name} (${penilaian.period.label}) dihapus`,
  })

  return NextResponse.json({ ok: true })
}
