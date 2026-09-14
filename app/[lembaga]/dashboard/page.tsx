import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { buildDashboardRows } from "@/lib/lembaga-dashboard-data"
import { resolvePeriod, listPeriods } from "@/lib/periods"
import { isLembaga, LEMBAGA } from "@/lib/lembaga"
import { LembagaDashboard } from "@/components/lembaga/LembagaDashboard"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ lembaga: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  const { lembaga } = await params
  if (!isLembaga(lembaga)) notFound()

  const session = await getSession(lembaga)
  if (!session) redirect(`/${lembaga}`)

  const { periode } = await searchParams
  const [period, periods] = await Promise.all([
    resolvePeriod(lembaga, periode),
    listPeriods(lembaga),
  ])

  const evaluatees = await getEvaluatees(session, lembaga)
  const rows = await buildDashboardRows(evaluatees, session.evaluatorId, period.id)

  return (
    <LembagaDashboard
      lembagaSlug={lembaga}
      lembagaLabel={LEMBAGA[lembaga].label}
      session={{
        evaluatorId: session.evaluatorId,
        name: session.name,
        role: session.role,
        divisi: session.divisi,
      }}
      evaluatees={rows}
      period={period}
      periods={periods}
    />
  )
}
