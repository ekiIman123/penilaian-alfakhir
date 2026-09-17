import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/lembaga-auth"
import {
  listPeriods, monthLabel, periodIdFor, defaultWindow, isPeriodStatus, statusMenurutJadwal,
} from "@/lib/periods"
import { catatAudit } from "@/lib/audit"
import { PENGELOLA_PERIODE as PERAN_PENGELOLA } from "@/lib/lembaga"

export const dynamic = "force-dynamic"

const VALID_LEMBAGA = ["iysa", "icgi", "iyora"]

/** Peran yang boleh membuka, menutup, dan menerbitkan periode. */
export const PENGELOLA_PERIODE: readonly string[] = PERAN_PENGELOLA

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lembaga = searchParams.get("lembaga")
  if (!lembaga || !VALID_LEMBAGA.includes(lembaga)) {
    return NextResponse.json({ error: "Lembaga tidak dikenal" }, { status: 400 })
  }

  const session = await getSession(lembaga)
  if (!session) return NextResponse.json({ error: "Tidak punya akses" }, { status: 401 })

  return NextResponse.json(await listPeriods(lembaga))
}

export async function POST(req: Request) {
  const { lembaga, year, month, status } = (await req.json()) as {
    lembaga?: string; year?: number; month?: number; status?: string
  }

  if (!lembaga || !VALID_LEMBAGA.includes(lembaga)) {
    return NextResponse.json({ error: "Lembaga tidak dikenal" }, { status: 400 })
  }

  const session = await getSession(lembaga)
  if (!session) {
    return NextResponse.json({ error: "Anda tidak punya jabatan di lembaga ini" }, { status: 403 })
  }
  if (!PENGELOLA_PERIODE.includes(session.role)) {
    return NextResponse.json({ error: "Peran Anda tidak bisa membuat periode" }, { status: 403 })
  }
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Tahun atau bulan tidak valid" }, { status: 400 })
  }

  const id = periodIdFor(lembaga, year, month)
  const sudahAda = await prisma.period.findUnique({ where: { id } })
  if (sudahAda) {
    return NextResponse.json(
      { error: `Periode ${monthLabel(year, month)} sudah ada` },
      { status: 409 },
    )
  }

  const win = defaultWindow(year, month)
  const row = await prisma.period.create({
    data: {
      id, lembaga, year, month,
      label: monthLabel(year, month),
      // Tanpa status eksplisit, periode mengikuti jadwalnya: bulan berjalan
      // langsung terbuka, bulan depan menunggu sebagai draf.
      status: status && isPeriodStatus(status) ? status : statusMenurutJadwal(win.opensAt, win.closesAt),
      opensAt: win.opensAt,
      closesAt: win.closesAt,
    },
  })

  await catatAudit({
    actorId: session.evaluatorId,
    actorName: session.name,
    action: "periode.buat",
    target: id,
    lembaga,
    detail: `Periode ${row.label} dibuat`,
  })

  return NextResponse.json(row, { status: 201 })
}
