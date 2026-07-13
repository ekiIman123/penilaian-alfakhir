import { prisma } from "@/lib/prisma"
import { EvaluationForm } from "@/components/evaluation-form"
import { parseScores } from "@/lib/calculations"

interface Props {
  searchParams: Promise<{ teacherId?: string; evaluatorId?: string }>
}

export default async function FormPage({ searchParams }: Props) {
  const { teacherId, evaluatorId } = await searchParams

  const [evaluators, teachers] = await Promise.all([
    prisma.evaluator.findMany({ where: { lembaga: "alfakhir" }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { lembaga: "alfakhir" }, orderBy: { name: "asc" } }),
  ])

  let existingEvaluation = null
  if (teacherId && evaluatorId) {
    const existing = await prisma.evaluation.findUnique({
      where: { evaluatorId_employeeId: { evaluatorId, employeeId: teacherId } },
    })
    if (existing) {
      existingEvaluation = {
        scores: parseScores(existing.scores),
        catatan: existing.catatan,
      }
    }
  }

  return (
    <EvaluationForm
      evaluators={evaluators}
      teachers={teachers}
      prefillEvaluatorId={evaluatorId}
      prefillTeacherId={teacherId}
      existingEvaluation={existingEvaluation}
    />
  )
}
