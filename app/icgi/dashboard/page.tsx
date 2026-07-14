import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { buildDashboardRows } from "@/lib/lembaga-dashboard-data"
import { LembagaDashboard } from "@/components/lembaga/LembagaDashboard"

export const dynamic = "force-dynamic"

export default async function IcgiDashboardPage() {
  const session = await getSession()
  const allowed = session && (session.lembaga === "icgi" || session.lembaga === "all")
  if (!allowed) redirect("/icgi")

  const evaluatees = await getEvaluatees(session!, "icgi")
  const rows = await buildDashboardRows(evaluatees, session!.evaluatorId)

  return (
    <LembagaDashboard
      lembagaSlug="icgi"
      lembagaLabel="ICGI"
      session={{ evaluatorId: session!.evaluatorId, name: session!.name, role: session!.role, divisi: session!.divisi }}
      evaluatees={rows}
    />
  )
}
