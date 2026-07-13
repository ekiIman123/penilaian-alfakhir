import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees, rubricTypeFor } from "@/lib/lembaga-evaluatees"
import { prisma } from "@/lib/prisma"
import { parseScores } from "@/lib/calculations"
import { EvalForm } from "@/components/lembaga/EvalForm"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ employeeId: string }>
}

export default async function IyoraFormPage({ params }: Props) {
  const { employeeId } = await params
  const session = await getSession()
  const allowed = session && (session.lembaga === "iyora" || session.lembaga === "all")
  if (!allowed) redirect("/iyora")

  const evaluatees = await getEvaluatees(session!, "iyora")
  const employee = evaluatees.find((e) => e.id === employeeId)
  if (!employee) notFound()

  const existing = await prisma.evaluation.findUnique({
    where: { evaluatorId_employeeId: { evaluatorId: session!.evaluatorId, employeeId } },
  })

  return (
    <EvalForm
      lembagaSlug="iyora"
      evaluatorId={session!.evaluatorId}
      employeeId={employee.id}
      employeeName={employee.name}
      employeeRole={employee.role}
      employeeDivisi={employee.divisi}
      rubricType={rubricTypeFor(employee.role)}
      existing={existing ? { scores: parseScores(existing.scores), catatan: existing.catatan } : null}
    />
  )
}
