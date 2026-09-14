import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees, rubricTypeFor } from "@/lib/lembaga-evaluatees"
import { prisma } from "@/lib/prisma"
import { parseScores } from "@/lib/calculations"
import { resolvePeriod, previousPeriodScores } from "@/lib/periods"
import { isLembaga } from "@/lib/lembaga"
import { EvalForm } from "@/components/lembaga/EvalForm"

export const dynamic = "force-dynamic"

export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ lembaga: string; employeeId: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  const { lembaga, employeeId } = await params
  if (!isLembaga(lembaga)) notFound()

  const { periode } = await searchParams
  const session = await getSession(lembaga)
  if (!session) redirect(`/${lembaga}`)

  const period = await resolvePeriod(lembaga, periode)

  const evaluatees = await getEvaluatees(session, lembaga)
  const employee = evaluatees.find((e) => e.id === employeeId)
  if (!employee) notFound()

  const [existing, bulanLalu] = await Promise.all([
    prisma.evaluation.findUnique({
      where: {
        periodId_evaluatorId_employeeId: {
          periodId: period.id,
          evaluatorId: session.evaluatorId,
          employeeId,
        },
      },
    }),
    previousPeriodScores(period, [employeeId], session.evaluatorId),
  ])

  return (
    <EvalForm
      lembagaSlug={lembaga}
      evaluatorId={session.evaluatorId}
      employeeId={employee.id}
      employeeName={employee.name}
      employeeRole={employee.role}
      employeeDivisi={employee.divisi}
      rubricType={rubricTypeFor(employee.role)}
      period={{
        id: period.id,
        label: period.label,
        status: period.status,
        dapatDinilai: period.dapatDinilai,
        sisaHari: period.sisaHari,
      }}
      sebelumnya={bulanLalu.label ? {
        label: bulanLalu.label,
        scores: bulanLalu.byEmployee[employeeId] ?? {},
      } : null}
      existing={
        existing
          ? { scores: parseScores(existing.scores), catatan: existing.catatan, status: existing.status }
          : null
      }
    />
  )
}
