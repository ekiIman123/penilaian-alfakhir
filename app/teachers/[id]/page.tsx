import { Fragment } from "react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { SECTIONS, getScoreGrade, EVALUATOR_COLORS } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw, parseScores } from "@/lib/calculations"
import { TeacherRadarChart } from "@/components/teacher-radar-chart"
import Link from "next/link"
import { ChevronLeft, Edit } from "lucide-react"
import { PdfDownloadButton } from "@/components/pdf-download-button"
import { DeleteEvaluationButton } from "@/components/delete-evaluation-button"

interface Props {
  params: Promise<{ id: string }>
}

// SVG score ring (server-renderable, no hooks)
function ScoreRing({ total, grade }: { total: number; grade: ReturnType<typeof getScoreGrade> }) {
  const r = 54
  const circ = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 120 120" width="110" height="110" className="block">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={r}
        fill="none"
        stroke={grade.color}
        strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={circ - (total / 4) * circ}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="57" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="900" fill={grade.color}>{total.toFixed(2)}</text>
      <text x="60" y="74" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)">/ 4.00</text>
    </svg>
  )
}

export default async function TeacherDetailPage({ params }: Props) {
  const { id } = await params

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: { evaluations: { include: { evaluator: true }, orderBy: { updatedAt: "desc" } } },
  })
  if (!teacher) notFound()

  const allEvaluators = await prisma.evaluator.findMany({ orderBy: { name: "asc" } })

  const parsedEvals = teacher.evaluations.map((e) => ({
    ...e,
    parsedScores: parseScores(e.scores),
  }))

  const totals = parsedEvals.map((e) => calcTotal(e.parsedScores))
  const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null
  const grade = avgTotal != null ? getScoreGrade(avgTotal) : null

  const radarData = SECTIONS.map((s) => {
    const entry: { subject: string; maxScore: number; [k: string]: number | string } = {
      subject: s.label.split(" ")[0],
      maxScore: s.maxScore,
    }
    parsedEvals.forEach((e) => {
      entry[e.evaluator.name] = calcSectionRaw(e.parsedScores, s.id)
    })
    return entry
  })

  const evaluatorNames = parsedEvals.map((e) => e.evaluator.name)

  const ratedByIds = new Set(parsedEvals.map((e) => e.evaluatorId))
  const missingEvaluators = allEvaluators.filter((e) => !ratedByIds.has(e.id))

  return (
    <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Hero card ── */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm mb-3 transition-colors font-medium"
            style={{ color: "rgba(92,61,17,0.75)" }}
          >
            <ChevronLeft size={15} /> Kembali ke Dashboard
          </Link>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 4px 24px rgba(44,26,8,0.18)" }}
          >
            {/* Gradient header */}
            <div
              className="px-6 py-6 text-white"
              style={{
                background: "linear-gradient(135deg, #1C0E04 0%, #3B2008 55%, #5C3D11 100%)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
                    Detail Guru
                  </p>
                  <h1 className="text-xl font-black leading-snug">{teacher.name}</h1>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>SMP Al Fakhir · TA 2025/2026</p>
                  <PdfDownloadButton teacherId={teacher.id} teacherName={teacher.name} />
                </div>
                {avgTotal != null && grade ? (
                  <div className="shrink-0">
                    <ScoreRing total={avgTotal} grade={grade} />
                    <div className="text-center mt-1">
                      <span
                        className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{ color: grade.color, backgroundColor: "rgba(255,255,255,0.15)" }}
                      >
                        {grade.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
                  >
                    Belum Dinilai
                  </div>
                )}
              </div>

              {/* Section score pills */}
              <div className="mt-5 flex flex-wrap gap-2">
                {SECTIONS.map((s) => {
                  const vals = parsedEvals.map((e) => calcSectionRaw(e.parsedScores, s.id))
                  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
                  const pct = avg != null ? Math.round((avg / s.maxScore) * 100) : 0
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
                    >
                      <span>{s.icon}</span>
                      <div>
                        <div className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
                          {s.label.split(" ")[0]}
                        </div>
                        <div className="text-xs font-black" style={{ color: avg != null ? s.color : "rgba(255,255,255,0.4)" }}>
                          {avg != null ? `${(avg * 4 / s.maxScore).toFixed(2)}/4` : "—"}
                        </div>
                        <div className="w-16 h-1 mt-0.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Radar Chart ── */}
        {parsedEvals.length > 0 && (
          <div className="card">
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #E7DDD0" }}>
              <h2 className="font-bold text-gray-800">Perbandingan Nilai per Aspek</h2>
              <p className="text-xs text-gray-400 mt-0.5">Nilai mentah per seksi dari setiap penilai</p>
            </div>
            <div className="p-4">
              <TeacherRadarChart radarData={radarData} evaluatorNames={evaluatorNames} />
            </div>
          </div>
        )}

        {/* ── Per-evaluator breakdown ── */}
        <div className="card">
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #E7DDD0" }}>
            <h2 className="font-bold text-gray-800">Detail Penilaian per Penilai</h2>
            <span className="text-xs text-gray-400">{parsedEvals.length}/{allEvaluators.length} penilai</span>
          </div>

          {parsedEvals.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm italic">Belum ada penilaian</div>
          ) : (
            <div>
              {parsedEvals.map((e, idx) => {
                const total = calcTotal(e.parsedScores)
                const g = getScoreGrade(total)
                const colorIdx = allEvaluators.findIndex((ev) => ev.id === e.evaluatorId)
                const color = EVALUATOR_COLORS[colorIdx % EVALUATOR_COLORS.length]
                return (
                  <div
                    key={e.id}
                    className="p-5"
                    style={{
                      borderLeft: `4px solid ${color}`,
                      borderBottom: idx < parsedEvals.length - 1 ? "1px solid #F3EDE6" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* Left: avatar + name + date */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0"
                          style={{ backgroundColor: color, boxShadow: `0 2px 8px ${color}50` }}
                        >
                          {e.evaluator.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 text-sm leading-snug">{e.evaluator.name}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(e.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                      {/* Right: score (top) + grade & actions (bottom) */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div>
                          <span className="text-lg font-black" style={{ color: g.color }}>{total.toFixed(2)}</span>
                          <span className="text-xs text-gray-400">/4.00</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                            style={{ color: g.color, backgroundColor: g.bg }}
                          >
                            {g.label}
                          </span>
                          <Link
                            href={`/form?teacherId=${teacher.id}&evaluatorId=${e.evaluatorId}`}
                            className="p-1.5 rounded-lg border transition-colors"
                            style={{ borderColor: "#E5E7EB", color: "#9CA3AF" }}
                            title="Edit penilaian"
                          >
                            <Edit size={13} />
                          </Link>
                          <DeleteEvaluationButton evaluationId={e.id} teacherId={teacher.id} />
                        </div>
                      </div>
                    </div>

                    {/* Section mini-bars */}
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {SECTIONS.map((s) => {
                        const raw = calcSectionRaw(e.parsedScores, s.id)
                        const pct = Math.round((raw / s.maxScore) * 100)
                        return (
                          <div key={s.id} className="text-center">
                            <div className="text-xs text-gray-400 mb-1">{s.icon}</div>
                            <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ backgroundColor: "#F3EDE6" }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                            </div>
                            <div className="text-xs font-bold tabular-nums" style={{ color: s.color }}>{raw}</div>
                          </div>
                        )
                      })}
                    </div>

                    {e.catatan && (
                      <div
                        className="mt-3 p-3 rounded-xl"
                        style={{ backgroundColor: "#F7F3ED", borderLeft: "3px solid #C4972A" }}
                      >
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "#92400E" }}>Catatan</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{e.catatan}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Missing evaluators CTA ── */}
        {missingEvaluators.length > 0 && (
          <div className="card">
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #E7DDD0" }}>
              <h2 className="font-bold text-gray-800">Penilai yang Belum Menilai</h2>
              <p className="text-xs text-gray-400 mt-0.5">{missingEvaluators.length} penilai belum memberikan nilai</p>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {missingEvaluators.map((ev, i) => {
                const color = EVALUATOR_COLORS[allEvaluators.findIndex((a) => a.id === ev.id) % EVALUATOR_COLORS.length]
                return (
                  <Link
                    key={ev.id}
                    href={`/form?teacherId=${teacher.id}&evaluatorId=${ev.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={{
                      backgroundColor: `${color}10`,
                      border: `1.5px solid ${color}40`,
                      color: color,
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                      style={{ backgroundColor: color }}
                    >
                      {ev.name.charAt(0)}
                    </span>
                    Nilai oleh {ev.name.split(",")[0]}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Criteria detail table ── */}
        <div className="card">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #E7DDD0" }}>
            <h2 className="font-bold text-gray-800">Detail Skor per Kriteria</h2>
            <p className="text-xs text-gray-400 mt-0.5">Rata-rata skor tiap kriteria dari semua penilai</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "#F7F2EC" }}>
                  <th className="text-left px-5 py-2.5 font-bold text-gray-500 uppercase tracking-wide min-w-[200px]">Kriteria</th>
                  {parsedEvals.map((e) => {
                    const evColor = EVALUATOR_COLORS[allEvaluators.findIndex((ev) => ev.id === e.evaluatorId) % EVALUATOR_COLORS.length]
                    return (
                      <th key={e.id} className="text-center px-4 py-2.5 font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: evColor }}>
                        {e.evaluator.name.split(",")[0]}
                      </th>
                    )
                  })}
                  {parsedEvals.length > 1 && (
                    <th className="text-center px-4 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Rata-rata</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map((s) => (
                  <Fragment key={s.id}>
                    <tr style={{ backgroundColor: `${s.color}12` }}>
                      <td
                        colSpan={parsedEvals.length + (parsedEvals.length > 1 ? 2 : 1)}
                        className="px-5 py-2 font-bold text-xs uppercase tracking-wide"
                        style={{ color: s.color }}
                      >
                        {s.icon} {s.label}
                      </td>
                    </tr>
                    {s.criteria.map((c, ci) => {
                      const vals = parsedEvals.map((e) => e.parsedScores[c.id] ?? 0)
                      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-amber-50/30 transition-colors"
                          style={{ borderBottom: "1px solid #F3EDE6" }}
                        >
                          <td className="px-5 py-2.5 text-gray-700">{c.label}</td>
                          {parsedEvals.map((e) => {
                            const score = e.parsedScores[c.id]
                            const evColor = EVALUATOR_COLORS[allEvaluators.findIndex((ev) => ev.id === e.evaluatorId) % EVALUATOR_COLORS.length]
                            return (
                              <td key={e.id} className="text-center px-4 py-2.5">
                                {score ? (
                                  <span
                                    className="inline-flex w-6 h-6 rounded-full items-center justify-center font-black text-white text-xs"
                                    style={{ backgroundColor: evColor }}
                                  >
                                    {score}
                                  </span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                            )
                          })}
                          {parsedEvals.length > 1 && (
                            <td className="text-center px-4 py-2.5 font-bold tabular-nums" style={{ color: s.color }}>
                              {avg != null ? avg.toFixed(1) : "—"}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

    </div>
  )
}
