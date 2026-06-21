import { prisma } from "@/lib/prisma"
import { SECTIONS, getScoreGrade } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw, parseScores } from "@/lib/calculations"
import Link from "next/link"
import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { DashboardTeacherList } from "@/components/dashboard/teacher-list"

export default async function DashboardPage() {
  const teachers = await prisma.teacher.findMany({
    include: { evaluations: { include: { evaluator: true } } },
    orderBy: { name: "asc" },
  })
  const evaluators = await prisma.evaluator.findMany({ orderBy: { name: "asc" } })
  const totalEvaluations = await prisma.evaluation.count()

  const ranked = teachers.map((t) => {
    const scoreSets = t.evaluations.map((e) => parseScores(e.scores))
    const totals = scoreSets.map(calcTotal)
    const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null
    const grade = avgTotal != null ? getScoreGrade(avgTotal) : null
    const sectionAvgs = SECTIONS.map((s) => {
      const vals = scoreSets.map((sc) => calcSectionRaw(sc, s.id))
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    })
    const ratedByIds = new Set(t.evaluations.map((e) => e.evaluatorId))
    return { ...t, avgTotal, grade, sectionAvgs, ratedByIds }
  }).sort((a, b) => {
    if (a.avgTotal == null && b.avgTotal == null) return 0
    if (a.avgTotal == null) return 1
    if (b.avgTotal == null) return -1
    return b.avgTotal - a.avgTotal
  })

  const complete = ranked.filter((t) => t.ratedByIds.size === evaluators.length && evaluators.length > 0).length
  const partial = ranked.filter((t) => t.ratedByIds.size > 0 && t.ratedByIds.size < evaluators.length).length
  const none = ranked.filter((t) => t.ratedByIds.size === 0).length

  // Serialize for client component (Set → array, only needed fields)
  const teacherRows = ranked.map((t) => ({
    id: t.id,
    name: t.name,
    avgTotal: t.avgTotal,
    grade: t.grade,
    sectionAvgs: t.sectionAvgs,
    ratedByEvaluatorIds: Array.from(t.ratedByIds),
  }))

  const evaluatorInfos = evaluators.map((e) => ({ id: e.id, name: e.name }))

  return (
    <div className="space-y-6 animate-in">
      {/* ── Hero banner ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1C0E04 0%, #3B2008 60%, #5C3D11 100%)",
          boxShadow: "0 4px 32px rgba(28,14,4,0.35)",
        }}
      >
        <div className="px-6 py-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "rgba(196,151,42,0.85)" }}
              >
                SMP Al Fakhir · TA 2025/2026
              </p>
              <h1 className="text-2xl font-black text-white leading-tight">
                Performance Appraisal Guru
              </h1>
              <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                Penilaian kinerja komprehensif · 5 aspek · 25 kriteria · Skala 1–4
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              {[
                { label: "Total Penilaian", value: totalEvaluations, icon: Users, color: "#C4972A" },
                { label: "Guru Selesai", value: complete, icon: CheckCircle2, color: "#22C55E" },
                { label: "Sebagian Dinilai", value: partial, icon: Clock, color: "#F59E0B" },
                { label: "Belum Dinilai", value: none, icon: AlertCircle, color: "#EF4444" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl px-4 py-3 flex flex-col gap-1"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.11)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <div
                    className="text-2xl font-black"
                    style={{ color: s.color, textShadow: `0 0 12px ${s.color}60` }}
                  >
                    {s.value}
                  </div>
                  <div
                    className="text-[10px] font-medium leading-tight"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #C4972A, #E8B84B, #C4972A)" }} />
      </div>

      <DashboardTeacherList teachers={teacherRows} evaluators={evaluatorInfos} />
    </div>
  )
}
