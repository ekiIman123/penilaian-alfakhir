import { prisma } from "@/lib/prisma"
import { EvaluationForm } from "@/components/evaluation-form"
import { parseScores } from "@/lib/calculations"
import { ensurePeriod } from "@/lib/periods"

interface Props {
  searchParams: Promise<{ teacherId?: string; evaluatorId?: string }>
}

export default async function FormPage({ searchParams }: Props) {
  const { teacherId, evaluatorId } = await searchParams

  const [evaluators, teachers] = await Promise.all([
    prisma.evaluator.findMany({ where: { lembaga: "alfakhir" }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { lembaga: "alfakhir" }, orderBy: { name: "asc" } }),
  ])

  // Alur lama Al Fakhir belum mengenal siklus bulanan; penilaiannya bernaung
  // di bawah periode bulan berjalan supaya tetap punya induk.
  const now = new Date()
  const period = await ensurePeriod("alfakhir", now.getFullYear(), now.getMonth() + 1, "dibuka")

  let existingEvaluation = null
  if (teacherId && evaluatorId) {
    const existing = await prisma.evaluation.findUnique({
      where: {
        periodId_evaluatorId_employeeId: { periodId: period.id, evaluatorId, employeeId: teacherId },
      },
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
