import { Fragment } from "react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EVALUATOR_COLORS, getSectionsForRole, getScoreGrade } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw, parseScores } from "@/lib/calculations"
import { TeacherRadarChart } from "@/components/teacher-radar-chart"
import { TeacherSwitcher } from "@/components/teacher-switcher"
import { TeacherDetailEvaluators } from "@/components/teacher-detail-evaluators"
import { CatatanFinalEditor } from "@/components/catatan-final-editor"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PdfDownloadButton } from "@/components/pdf-download-button"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

function ScoreRing({ total, grade }: { total: number; grade: ReturnType<typeof getScoreGrade> }) {
  const r = 54
  const circ = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 120 120" width="110" height="110" className="block">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
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
      <text x="60" y="57" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="700" fill={grade.color}>{total.toFixed(2)}</text>
      <text x="60" y="74" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.50)">/ 4.00</text>
    </svg>
  )
}

export default async function TeacherDetailPage({ params }: Props) {
  const { id } = await params

  const [teacher, allTeachers, allEvaluators] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: { evaluations: { include: { evaluator: true }, orderBy: { updatedAt: "desc" } } },
    }),
    prisma.employee.findMany({ where: { lembaga: "alfakhir" }, orderBy: { name: "asc" } }),
    prisma.evaluator.findMany({ where: { lembaga: "alfakhir" }, orderBy: { name: "asc" } }),
  ])

  if (!teacher) notFound()

  const sections = getSectionsForRole(teacher.role)
  const isStaff = teacher.role === "staff"

  const parsedEvals = teacher.evaluations.map((e) => ({
    ...e,
    parsedScores: parseScores(e.scores),
  }))

  const totals = parsedEvals.map((e) => calcTotal(e.parsedScores, sections))
  const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null
  const grade = avgTotal != null ? getScoreGrade(avgTotal) : null

  const evalRows = parsedEvals.map((e) => ({
    id: e.id,
    evaluatorId: e.evaluatorId,
    evaluatorName: e.evaluator.name,
    parsedScores: e.parsedScores,
    catatan: e.catatan,
    updatedAt: e.updatedAt.toISOString(),
  }))

  const fallbackCatatan = parsedEvals
    .filter((e) => e.catatan)
    .map((e) => `${e.evaluator.name.split(",")[0]}: ${e.catatan}`)
    .join(" | ")

  const radarData = sections.map((s) => {
    const entry: { subject: string; maxScore: number; [k: string]: number | string } = {
      subject: s.label === "AL FAKHIR'S CORE VALUES" ? "Core Values" : s.label.charAt(0) + s.label.slice(1).toLowerCase(),
      maxScore: s.maxScore,
    }
    parsedEvals.forEach((e) => {
      entry[e.evaluator.name] = calcSectionRaw(e.parsedScores, s.id, sections)
    })
    return entry
  })

  const evaluatorNames = parsedEvals.map((e) => e.evaluator.name)
  const ratedByIds = new Set(parsedEvals.map((e) => e.evaluatorId))
  const missingEvaluators = allEvaluators.filter((e) => !ratedByIds.has(e.id))

  function sectionShortLabel(label: string) {
    if (label === "AL FAKHIR'S CORE VALUES") return "Core Values"
    return label.charAt(0) + label.slice(1).toLowerCase()
  }

  return (
    <div className="space-y-6 animate-in">

      {/* ── Navigation row ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/alfakhir"
          className="inline-flex items-center gap-1 text-sm transition-colors font-medium shrink-0"
          style={{ color: "#64748B" }}
        >
          <ChevronLeft size={14} /> Kembali ke Dashboard
        </Link>
        <TeacherSwitcher currentId={id} teachers={allTeachers} />
      </div>

      {/* ── Hero card ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ boxShadow: "0 4px 20px rgba(15,37,64,0.18)" }}
      >
        <div
          className="px-6 py-6 text-white"
          style={{ background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
                {isStaff ? "Detail Staf" : "Detail Guru"} · SMP Al Fakhir · TA 2025/2026
              </p>
              <h1 className="text-xl font-bold leading-snug truncate">{teacher.name}</h1>
              <div className="mt-2">
                <PdfDownloadButton teacherId={teacher.id} teacherName={teacher.name} />
              </div>
            </div>
            {avgTotal != null && grade ? (
              <div className="shrink-0 text-center">
                <ScoreRing total={avgTotal} grade={grade} />
                <span
                  className="inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ color: grade.color, backgroundColor: "rgba(255,255,255,0.12)" }}
                >
                  {grade.label}
                </span>
              </div>
            ) : (
              <div
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}
              >
                Belum Dinilai
              </div>
            )}
          </div>

          {/* Section score pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {sections.map((s) => {
              const vals = parsedEvals.map((e) => calcSectionRaw(e.parsedScores, s.id, sections))
              const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
              const norm = avg != null ? (avg * 4 / s.maxScore) : null
              const pct = avg != null ? Math.round((avg / s.maxScore) * 100) : 0
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <div>
                    <div className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>
                      {sectionShortLabel(s.label)}
                    </div>
                    <div className="text-xs font-bold" style={{ color: norm != null ? s.color : "rgba(255,255,255,0.35)" }}>
                      {norm != null ? `${norm.toFixed(2)}/4` : "—"}
                    </div>
                    <div className="w-16 h-1 mt-0.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />
      </div>

      {/* ── 2-column: Per-evaluator + Radar / Missing ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* Left: Per-evaluator breakdown */}
        <TeacherDetailEvaluators
          teacherId={teacher.id}
          teacherName={teacher.name}
          teacherRole={teacher.role ?? "guru"}
          evaluations={evalRows}
          allEvaluators={allEvaluators.map((e) => ({ id: e.id, name: e.name }))}
        />

        {/* Right: Radar chart + Missing evaluators */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Radar chart */}
          {parsedEvals.length > 0 ? (
            <div className="card">
              <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
                <h2 className="font-semibold text-slate-800 text-sm">Radar Perbandingan Aspek</h2>
                <p className="text-xs text-slate-400 mt-0.5">Nilai tiap aspek dari setiap penilai</p>
              </div>
              <div className="p-4">
                <TeacherRadarChart radarData={radarData} evaluatorNames={evaluatorNames} />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
                <h2 className="font-semibold text-slate-800 text-sm">Radar Perbandingan Aspek</h2>
              </div>
              <div className="p-10 text-center text-slate-400 text-sm">Belum ada data untuk ditampilkan</div>
            </div>
          )}

          {/* Catatan Final */}
          <CatatanFinalEditor
            teacherId={teacher.id}
            savedValue={teacher.finalCatatan ?? null}
            fallbackValue={fallbackCatatan}
          />

          {/* Missing evaluators */}
          {missingEvaluators.length > 0 && (
            <div className="card">
              <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
                <h2 className="font-semibold text-slate-800 text-sm">Penilai Belum Menilai</h2>
                <p className="text-xs text-slate-400 mt-0.5">{missingEvaluators.length} penilai belum memberikan nilai</p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {missingEvaluators.map((ev) => {
                  const color = EVALUATOR_COLORS[allEvaluators.findIndex((a) => a.id === ev.id) % EVALUATOR_COLORS.length]
                  return (
                    <Link
                      key={ev.id}
                      href={`/alfakhir/form?teacherId=${teacher.id}&evaluatorId=${ev.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: `${color}0F`,
                        border: `1px solid ${color}35`,
                        color,
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
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

        </div>
      </div>

      {/* ── Criteria detail table ── */}
      <div className="card">
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
          <h2 className="font-semibold text-slate-800 text-sm">Detail Skor per Kriteria</h2>
          <p className="text-xs text-slate-400 mt-0.5">Rata-rata skor tiap kriteria dari semua penilai</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: "480px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F0F4F9" }}>
                <th className="text-left px-5 py-2.5 font-semibold text-slate-500 uppercase tracking-wide min-w-[180px]">Kriteria</th>
                {parsedEvals.map((e) => {
                  return (
                    <th key={e.id} className="text-center px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "#6B7280" }}>
                      {e.evaluator.name.split(",")[0]}
                    </th>
                  )
                })}
                {parsedEvals.length > 1 && (
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Rata-rata</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <Fragment key={s.id}>
                  <tr style={{ backgroundColor: `${s.color}0F` }}>
                    <td
                      colSpan={parsedEvals.length + (parsedEvals.length > 1 ? 2 : 1)}
                      className="px-5 py-2 font-semibold text-xs uppercase tracking-wide"
                      style={{ color: "#374151" }}
                    >
                      {s.label}
                    </td>
                  </tr>
                  {s.criteria.map((c) => {
                    const vals = parsedEvals.map((e) => e.parsedScores[c.id] ?? 0)
                    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
                    return (
                      <tr
                        key={c.id}
                        className="tr-hover"
                        style={{ borderBottom: "1px solid #EDF0F5" }}
                      >
                        <td className="px-5 py-2.5 text-slate-600">{c.label}</td>
                        {parsedEvals.map((e) => {
                          const score = e.parsedScores[c.id]
                          return (
                            <td key={e.id} className="text-center px-4 py-2.5">
                              {score ? (
                                <span
                                  className="inline-flex w-6 h-6 rounded-full items-center justify-center font-semibold text-white text-xs"
                                  style={{ backgroundColor: "#1E3A5F" }}
                                >
                                  {score}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          )
                        })}
                        {parsedEvals.length > 1 && (
                          <td className="text-center px-4 py-2.5 font-semibold tabular-nums" style={{ color: "#111827" }}>
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
