import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { buildDashboardRows } from "@/lib/lembaga-dashboard-data"
import { LembagaDashboard } from "@/components/lembaga/LembagaDashboard"

export const dynamic = "force-dynamic"

export default async function IysaDashboardPage() {
  const session = await getSession()
  const allowed = session && (session.lembaga === "iysa" || session.lembaga === "all")
  if (!allowed) redirect("/iysa")

  const evaluatees = await getEvaluatees(session!, "iysa")
  const rows = await buildDashboardRows(evaluatees, session!.evaluatorId)

  return (
    <LembagaDashboard
      lembagaSlug="iysa"
      lembagaLabel="IYSA"
      session={{ evaluatorId: session!.evaluatorId, name: session!.name, role: session!.role, divisi: session!.divisi }}
      evaluatees={rows}
    />
  )
}
