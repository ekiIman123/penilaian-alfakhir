import { prisma } from "@/lib/prisma"
import { SECTIONS, getScoreGrade } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw, parseScores } from "@/lib/calculations"
import Link from "next/link"
import { Users, CheckCircle2, Clock, AlertCircle, PenLine } from "lucide-react"
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
  const partial  = ranked.filter((t) => t.ratedByIds.size > 0 && t.ratedByIds.size < evaluators.length).length
  const none     = ranked.filter((t) => t.ratedByIds.size === 0).length

  const teacherRows = ranked.map((t) => ({
    id: t.id,
    name: t.name,
    avgTotal: t.avgTotal,
    grade: t.grade,
    sectionAvgs: t.sectionAvgs,
    ratedByEvaluatorIds: Array.from(t.ratedByIds),
    // Per-evaluator breakdown for inline display & edit
    evaluationSummaries: t.evaluations.map((e) => {
      const parsed = parseScores(e.scores)
      const total  = calcTotal(parsed)
      const evGrade = getScoreGrade(total)
      const sectionNorms = SECTIONS.map((s) => {
        const raw = calcSectionRaw(parsed, s.id)
        return raw * 4 / s.maxScore
      })
      return {
        evaluatorId:   e.evaluatorId,
        evaluatorName: e.evaluator.name,
        total,
        grade:         evGrade,
        sectionNorms,
      }
    }),
  }))

  const evaluatorInfos = evaluators.map((e) => ({ id: e.id, name: e.name }))

  const stats = [
    { label: "Total Penilaian",  value: totalEvaluations, icon: Users,        color: "#C4972A" },
    { label: "Guru Selesai",     value: complete,          icon: CheckCircle2, color: "#16A34A" },
    { label: "Sebagian Dinilai", value: partial,           icon: Clock,        color: "#D97706" },
    { label: "Belum Dinilai",    value: none,              icon: AlertCircle,  color: "#DC2626" },
  ]

  return (
    <div className="space-y-6 animate-in">
      {/* ── Page header ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <div className="px-6 py-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
                SMP Al Fakhir · TA 2025/2026
              </p>
              <h1 className="text-xl font-bold text-white leading-tight">Performance Appraisal Guru</h1>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>
                Penilaian kinerja komprehensif · 5 aspek · Skala 1–4
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              {stats.map((s) => {
                const Icon = s.icon
                return (
                  <div
                    key={s.label}
                    className="rounded-lg px-4 py-3 flex items-center gap-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    <Icon size={16} style={{ color: s.color, flexShrink: 0 }} />
                    <div>
                      <div className="text-xl font-bold tabular-nums leading-none" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.50)" }}>{s.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />
      </div>

      {/* ── Quick action ── */}
      <div className="flex justify-end">
        <Link
          href="/form"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1E3A5F", boxShadow: "0 2px 8px rgba(15,37,64,0.20)" }}
        >
          <PenLine size={15} />
          Input Penilaian
        </Link>
      </div>

      <DashboardTeacherList teachers={teacherRows} evaluators={evaluatorInfos} />
    </div>
  )
}
