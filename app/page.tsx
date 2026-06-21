import { prisma } from "@/lib/prisma"
import { SECTIONS, getScoreGrade, EVALUATOR_COLORS } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw, parseScores } from "@/lib/calculations"
import Link from "next/link"
import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react"

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EDE8E1" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

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

  const RANK_MEDALS = ["🥇", "🥈", "🥉"]

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

      {/* ── Unified Teacher List ── */}
      <div className="card">
        {/* Section header */}
        <div
          className="px-5 py-4 flex flex-col gap-3"
          style={{ borderBottom: "1px solid #E7DDD0" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Rekapitulasi Penilaian Guru</h2>
            <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>
              Diurutkan: nilai tertinggi
            </span>
          </div>

          {/* Evaluator legend — robust against name changes, keyed by id */}
          {evaluators.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-widest shrink-0"
                style={{ color: "#9CA3AF" }}
              >
                Penilai:
              </span>
              {evaluators.map((e, i) => (
                <div
                  key={e.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${EVALUATOR_COLORS[i % EVALUATOR_COLORS.length]}15`,
                    color: EVALUATOR_COLORS[i % EVALUATOR_COLORS.length],
                    border: `1px solid ${EVALUATOR_COLORS[i % EVALUATOR_COLORS.length]}30`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                    style={{ backgroundColor: EVALUATOR_COLORS[i % EVALUATOR_COLORS.length] }}
                  >
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[140px]">{e.name.split(",")[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teacher rows */}
        <div className="divide-y" style={{ borderColor: "#F3EDE6" }}>
          {ranked.map((t, i) => {
            const completionCount = t.ratedByIds.size
            const isComplete = evaluators.length > 0 && completionCount === evaluators.length
            const isPartial = completionCount > 0 && !isComplete

            const scoreEl = t.avgTotal != null ? (
              <div className="text-right">
                <span className="text-xl font-black leading-none" style={{ color: t.grade?.color }}>
                  {t.avgTotal.toFixed(2)}
                </span>
                <span className="text-[10px] ml-0.5" style={{ color: "#9CA3AF" }}>/4.00</span>
              </div>
            ) : (
              <span className="text-gray-300 text-xs italic">—</span>
            )

            const gradeEl = t.grade ? (
              <span
                className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                style={{ color: t.grade.color, backgroundColor: t.grade.bg }}
              >
                {t.grade.label}
              </span>
            ) : (
              <span className="text-[10px] italic" style={{ color: "#D1D5DB" }}>Belum</span>
            )

            const dotsEl = (
              <div className="flex items-center gap-1.5">
                {evaluators.map((e, ei) => {
                  const rated = t.ratedByIds.has(e.id)
                  const color = EVALUATOR_COLORS[ei % EVALUATOR_COLORS.length]
                  return (
                    <div
                      key={e.id}
                      title={`${e.name.split(",")[0]}: ${rated ? "Sudah dinilai ✓" : "Belum dinilai"}`}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                      style={
                        rated
                          ? { backgroundColor: color, color: "white" }
                          : { backgroundColor: "transparent", border: `1.5px dashed ${color}50`, color: `${color}70` }
                      }
                    >
                      {rated ? e.name.charAt(0).toUpperCase() : "·"}
                    </div>
                  )
                })}
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isComplete ? "#16A34A" : isPartial ? "#D97706" : "#9CA3AF" }}
                >
                  {completionCount}/{evaluators.length}
                </span>
              </div>
            )

            return (
              <div
                key={t.id}
                className="px-4 sm:px-5 py-4 hover:bg-amber-50/30 transition-colors"
              >
                <div className="flex items-start gap-3 md:items-center md:gap-4">

                  {/* Rank */}
                  <div className="w-8 shrink-0 text-center pt-0.5 md:pt-0">
                    {i < 3 ? (
                      <span className="text-lg" title={`Peringkat ${i + 1}`}>{RANK_MEDALS[i]}</span>
                    ) : (
                      <span
                        className="inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-black"
                        style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Name + dots + (mobile) score & buttons */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + mobile score */}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/teachers/${t.id}`}
                        className="font-semibold text-sm hover:underline leading-snug"
                        style={{ color: "#1C1917" }}
                      >
                        {t.name}
                      </Link>
                      {/* Score — mobile only */}
                      <div className="md:hidden shrink-0">{scoreEl}</div>
                    </div>

                    {/* Row 2: dots + (mobile) grade & buttons */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      {dotsEl}
                      {/* Grade + actions — mobile only */}
                      <div className="md:hidden flex items-center gap-1.5">
                        {gradeEl}
                        <Link
                          href={`/teachers/${t.id}`}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg"
                          style={{ backgroundColor: "#5C3D11" }}
                        >
                          Detail
                        </Link>
                        <Link
                          href={`/form?teacherId=${t.id}`}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg"
                          style={{ backgroundColor: "#C4972A", color: "#1C1409" }}
                        >
                          Nilai
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Mini-bars — lg+ only */}
                  <div className="hidden lg:flex flex-col gap-1 w-40 shrink-0">
                    {SECTIONS.map((s, si) => {
                      const avg = t.sectionAvgs[si]
                      const norm = avg != null ? (avg * 4) / s.maxScore : null
                      return (
                        <div key={s.id} className="flex items-center gap-1.5">
                          <span className="text-[11px] w-3.5 shrink-0 text-center">{s.icon}</span>
                          <MiniBar value={norm ?? 0} max={4} color={norm != null ? s.color : "#E5E7EB"} />
                          <span
                            className="text-[10px] font-bold w-6 text-right shrink-0"
                            style={{ color: norm != null ? s.color : "#D1D5DB" }}
                          >
                            {norm != null ? norm.toFixed(1) : "—"}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Score — md+ only */}
                  <div className="hidden md:block w-16 shrink-0 text-center">{scoreEl}</div>

                  {/* Grade + actions — md+ only */}
                  <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
                    {gradeEl}
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/teachers/${t.id}`}
                        className="px-2.5 py-1 text-xs font-semibold text-white rounded-lg transition-colors"
                        style={{ backgroundColor: "#5C3D11" }}
                      >
                        Detail
                      </Link>
                      <Link
                        href={`/form?teacherId=${t.id}`}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                        style={{ backgroundColor: "#C4972A", color: "#1C1409" }}
                      >
                        Nilai
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {ranked.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">👨‍🏫</span>
              <p className="text-sm font-medium" style={{ color: "#78716C" }}>
                Belum ada data guru
              </p>
              <Link
                href="/admin"
                className="px-4 py-2 text-sm font-bold rounded-lg text-white"
                style={{ backgroundColor: "#5C3D11" }}
              >
                Kelola Data Master
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
