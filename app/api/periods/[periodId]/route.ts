import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/lembaga-auth"
import { isPeriodStatus, type PeriodStatus } from "@/lib/periods"
import { publishPeriod, unpublishPeriod } from "@/lib/period-publish"
import { catatAudit, type AksiAudit } from "@/lib/audit"
import { PENGELOLA_PERIODE } from "../route"

export const dynamic = "force-dynamic"

/**
 * Perpindahan status yang diizinkan. Siklusnya maju draf → dibuka → ditutup →
 * final, dengan dua jalan mundur untuk memperbaiki kekeliruan: membuka kembali
 * periode yang terlanjur ditutup, dan menarik rapor yang terlanjur terbit.
 */
const TRANSISI: Record<PeriodStatus, PeriodStatus[]> = {
  draf:    ["dibuka"],
  dibuka:  ["ditutup", "draf"],
  ditutup: ["final", "dibuka"],
  final:   ["ditutup"],
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/periods/[periodId]">,
) {
  const { periodId } = await ctx.params

  const period = await prisma.period.findUnique({ where: { id: periodId } })
  if (!period) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 })

  // Sesi diarahkan ke lembaga periode ini — orang yang memegang beberapa
  // jabatan harus bertindak dengan jabatan yang tepat.
  const session = await getSession(period.lembaga)
  if (!session) {
    return NextResponse.json({ error: "Anda tidak punya jabatan di lembaga ini" }, { status: 403 })
  }
  if (!PENGELOLA_PERIODE.includes(session.role)) {
    return NextResponse.json({ error: "Peran Anda tidak bisa mengubah periode" }, { status: 403 })
  }

  const body = (await req.json()) as { status?: string; opensAt?: string; closesAt?: string }

  // ── Menggeser jendela pengisian ────────────────────────────────────────
  const data: { opensAt?: Date; closesAt?: Date; status?: string; publishedAt?: Date | null } = {}
  if (body.opensAt)  data.opensAt  = new Date(body.opensAt)
  if (body.closesAt) data.closesAt = new Date(body.closesAt)
  if (data.opensAt && data.closesAt && data.opensAt >= data.closesAt) {
    return NextResponse.json({ error: "Tanggal tutup harus setelah tanggal buka" }, { status: 400 })
  }

  // ── Berpindah status ───────────────────────────────────────────────────
  let pesan = "Periode diperbarui"
  let aksi: AksiAudit | null = null

  if (body.status) {
    if (!isPeriodStatus(body.status)) {
      return NextResponse.json({ error: `Status "${body.status}" tidak dikenal` }, { status: 400 })
    }
    const dari = isPeriodStatus(period.status) ? period.status : "draf"
    const ke = body.status

    if (dari !== ke) {
      if (!TRANSISI[dari].includes(ke)) {
        return NextResponse.json(
          { error: `Periode ${period.label} tidak bisa langsung berpindah dari ${dari} ke ${ke}` },
          { status: 409 },
        )
      }

      if (ke === "final") {
        const hasil = await publishPeriod(periodId, period.lembaga)
        if (hasil.diterbitkan === 0) {
          return NextResponse.json(
            { error: "Belum ada satu pun penilaian terkirim — rapor tidak bisa diterbitkan" },
            { status: 409 },
          )
        }
        data.publishedAt = new Date()
        pesan = `Rapor ${period.label} terbit untuk ${hasil.diterbitkan} orang`
        if (hasil.dilewati > 0) pesan += ` (${hasil.dilewati} orang tanpa penilaian, dilewati)`
      }

      if (dari === "final" && ke === "ditutup") {
        const dibuang = await unpublishPeriod(periodId)
        data.publishedAt = null
        pesan = `Rapor ${period.label} ditarik kembali (${dibuang} rapor dibatalkan)`
      }

      if (ke === "dibuka") {
        pesan = dari === "ditutup"
          ? `Periode ${period.label} dibuka kembali`
          : `Periode ${period.label} dibuka`
      }
      if (ke === "ditutup" && dari === "dibuka") {
        const draf = await prisma.evaluation.count({ where: { periodId, status: "draf" } })
        pesan = `Periode ${period.label} ditutup`
        if (draf > 0) pesan += ` — ${draf} penilaian masih berstatus draf dan tidak ikut dihitung`
      }

      data.status = ke
      aksi =
        ke === "final"                        ? "periode.terbitkan"
        : dari === "final" && ke === "ditutup" ? "periode.tarik"
        : ke === "ditutup"                     ? "periode.tutup"
        : dari === "ditutup" && ke === "dibuka" ? "periode.buka-kembali"
        : "periode.buka"
    }
  }

  const updated = await prisma.period.update({ where: { id: periodId }, data })

  // Membuka kembali periode yang sudah ditutup dan menarik rapor yang sudah
  // terbit adalah tindakan yang mengubah kesepakatan — harus ada jejaknya.
  if (aksi) {
    await catatAudit({
      actorId: session.evaluatorId,
      actorName: session.name,
      action: aksi,
      target: periodId,
      lembaga: period.lembaga,
      detail: pesan,
    })
  }

  return NextResponse.json({ period: updated, pesan })
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/periods/[periodId]">,
) {
  const { periodId } = await ctx.params

  const period = await prisma.period.findUnique({ where: { id: periodId } })
  if (!period) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 })

  const session = await getSession(period.lembaga)
  if (!session) return NextResponse.json({ error: "Tidak punya akses" }, { status: 403 })

  const [terkirim, draf] = await Promise.all([
    prisma.evaluation.count({ where: { periodId, status: "terkirim" } }),
    prisma.evaluation.count({ where: { periodId, status: "draf" } }),
  ])

  return NextResponse.json({ ...period, terkirim, draf })
}
