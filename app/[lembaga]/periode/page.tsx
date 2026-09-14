import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { prisma } from "@/lib/prisma"
import { listPeriods } from "@/lib/periods"
import { isLembaga, LEMBAGA, bolehKelolaPeriode } from "@/lib/lembaga"
import { riwayatAudit } from "@/lib/audit"
import { PeriodManager, type PeriodRow } from "@/components/periods/PeriodManager"

export const dynamic = "force-dynamic"

export default async function PeriodePage({
  params,
}: {
  params: Promise<{ lembaga: string }>
}) {
  const { lembaga } = await params
  if (!isLembaga(lembaga)) notFound()

  const session = await getSession(lembaga)
  if (!session) redirect(`/${lembaga}`)
  if (!bolehKelolaPeriode(session.role)) redirect(`/${lembaga}/dashboard`)

  const [periods, jejak] = await Promise.all([listPeriods(lembaga), riwayatAudit(lembaga, 30)])

  // Menghitung isi tiap periode dalam satu putaran, bukan satu query per baris.
  const ids = periods.map((p) => p.id)
  const [evalCounts, raporCounts] = await Promise.all([
    ids.length
      ? prisma.evaluation.groupBy({
          by: ["periodId", "status"],
          where: { periodId: { in: ids } },
          _count: { _all: true },
        })
      : [],
    ids.length
      ? prisma.periodResult.groupBy({
          by: ["periodId"],
          where: { periodId: { in: ids } },
          _count: { _all: true },
        })
      : [],
  ])

  const rows: PeriodRow[] = periods.map((p) => ({
    id: p.id,
    year: p.year,
    month: p.month,
    label: p.label,
    status: p.status,
    opensAt: p.opensAt,
    closesAt: p.closesAt,
    publishedAt: p.publishedAt,
    terkirim: evalCounts.find((c) => c.periodId === p.id && c.status === "terkirim")?._count._all ?? 0,
    draf:     evalCounts.find((c) => c.periodId === p.id && c.status === "draf")?._count._all ?? 0,
    rapor:    raporCounts.find((c) => c.periodId === p.id)?._count._all ?? 0,
  }))

  return (
    <PeriodManager
      lembagaSlug={lembaga}
      lembagaLabel={LEMBAGA[lembaga].label}
      periods={rows}
      jejak={jejak.map((j) => ({
        id: j.id,
        actorName: j.actorName,
        action: j.action,
        detail: j.detail,
        createdAt: j.createdAt,
      }))}
    />
  )
}
