import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees, rubricTypeFor } from "@/lib/lembaga-evaluatees"
import { prisma } from "@/lib/prisma"
import { parseScores } from "@/lib/calculations"
import { resolvePeriod, previousPeriodScores } from "@/lib/periods"
import { isLembaga } from "@/lib/lembaga"
import { FastEvalGrid, type FastEvaluatee } from "@/components/lembaga/FastEvalGrid"

export const dynamic = "force-dynamic"

function parseCatatan(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try {
    const p = JSON.parse(raw)
    return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export default async function NilaiCepatPage({
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
  const period = await resolvePeriod(lembaga, periode)

  const evaluatees = await getEvaluatees(session, lembaga)
  if (evaluatees.length === 0) redirect(`/${lembaga}/dashboard`)

  const ids = evaluatees.map((e) => e.id)
  const [existing, bulanLalu] = await Promise.all([
    prisma.evaluation.findMany({
      where: { periodId: period.id, evaluatorId: session.evaluatorId, employeeId: { in: ids } },
      select: { employeeId: true, scores: true, catatan: true, status: true },
    }),
    previousPeriodScores(period, ids, session.evaluatorId),
  ])

  const byId = new Map(existing.map((e) => [e.employeeId, e]))

  const rows: FastEvaluatee[] = evaluatees.map((e) => {
    const punya = byId.get(e.id)
    return {
      id: e.id,
      name: e.name,
      role: e.role,
      divisi: e.divisi,
      rubricType: rubricTypeFor(e.role),
      scores: punya ? parseScores(punya.scores) : {},
      catatan: parseCatatan(punya?.catatan ?? null),
      status: !punya ? "belum" : punya.status === "terkirim" ? "terkirim" : "draf",
      lalu: bulanLalu.byEmployee[e.id] ?? {},
    }
  })

  return (
    <FastEvalGrid
      lembagaSlug={lembaga}
      period={{
        id: period.id,
        label: period.label,
        status: period.status,
        dapatDinilai: period.dapatDinilai,
        sisaHari: period.sisaHari,
      }}
      evaluatees={rows}
      laluLabel={bulanLalu.label}
    />
  )
}
