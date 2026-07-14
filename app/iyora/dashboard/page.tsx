import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { buildDashboardRows } from "@/lib/lembaga-dashboard-data"
import { LembagaDashboard } from "@/components/lembaga/LembagaDashboard"

export const dynamic = "force-dynamic"

export default async function IyoraDashboardPage() {
  const session = await getSession()
  const allowed = session && (session.lembaga === "iyora" || session.lembaga === "all")
  if (!allowed) redirect("/iyora")

  const evaluatees = await getEvaluatees(session!, "iyora")
  const rows = await buildDashboardRows(evaluatees, session!.evaluatorId)

  return (
    <LembagaDashboard
      lembagaSlug="iyora"
      lembagaLabel="IYORA"
      session={{ evaluatorId: session!.evaluatorId, name: session!.name, role: session!.role, divisi: session!.divisi }}
      evaluatees={rows}
    />
  )
}
