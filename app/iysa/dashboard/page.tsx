import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { prisma } from "@/lib/prisma"
import { LembagaDashboard } from "@/components/lembaga/LembagaDashboard"

export const dynamic = "force-dynamic"

export default async function IysaDashboardPage() {
  const session = await getSession()
  const allowed = session && (session.lembaga === "iysa" || session.lembaga === "all")
  if (!allowed) redirect("/iysa")

  const evaluatees = await getEvaluatees(session!, "iysa")
  const evaluatedIds = new Set(
    (await prisma.evaluation.findMany({
      where: { evaluatorId: session!.evaluatorId, employeeId: { in: evaluatees.map((e) => e.id) } },
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

  const grouped = session!.role === "supervisor" || session!.role === "founder"

  return (
    <LembagaDashboard
      lembagaSlug="iysa"
      lembagaLabel="IYSA"
      session={{ name: session!.name, role: session!.role, divisi: session!.divisi }}
      evaluatees={rows}
      grouped={grouped}
    />
  )
}
