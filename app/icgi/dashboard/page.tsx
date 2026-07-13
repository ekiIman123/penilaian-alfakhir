import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { prisma } from "@/lib/prisma"
import { LembagaDashboard } from "@/components/lembaga/LembagaDashboard"

export const dynamic = "force-dynamic"

export default async function IcgiDashboardPage() {
  const session = await getSession()
  if (!session || session.lembaga !== "icgi") redirect("/icgi")

  const evaluatees = await getEvaluatees(session)
  const evaluatedIds = new Set(
    (await prisma.evaluation.findMany({
      where: { evaluatorId: session.evaluatorId, employeeId: { in: evaluatees.map((e) => e.id) } },
      select: { employeeId: true },
    })).map((e) => e.employeeId)
  )

  const rows = evaluatees.map((e) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    divisi: e.divisi,
    evaluated: evaluatedIds.has(e.id),
  }))

  return (
    <LembagaDashboard
      lembagaSlug="icgi"
      lembagaLabel="ICGI"
      session={{ name: session.name, role: session.role, divisi: session.divisi }}
      evaluatees={rows}
    />
  )
}
