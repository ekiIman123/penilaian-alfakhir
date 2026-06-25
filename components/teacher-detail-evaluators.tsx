"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit } from "lucide-react"
import { EVALUATOR_COLORS, getScoreGrade, getSectionsForRole } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw } from "@/lib/calculations"
import { QuickEditModal, type EditTarget } from "@/components/quick-edit-modal"
import { DeleteEvaluationButton } from "@/components/delete-evaluation-button"

export interface EvalRow {
  id: string
  evaluatorId: string
  evaluatorName: string
  parsedScores: Record<string, number>
  catatan: string | null
  updatedAt: string
}

interface Props {
  teacherId: string
  teacherName: string
  teacherRole: string
  evaluations: EvalRow[]
  allEvaluators: { id: string; name: string }[]
}

export function TeacherDetailEvaluators({
  teacherId,
  teacherName,
  teacherRole,
  evaluations,
  allEvaluators,
}: Props) {
  const sections = getSectionsForRole(teacherRole)
  const router = useRouter()
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)

  function openEdit(ev: EvalRow) {
    const colorIdx = allEvaluators.findIndex((a) => a.id === ev.evaluatorId)
    setEditTarget({
      teacherId,
      teacherName,
      role: teacherRole,
      evaluatorId: ev.evaluatorId,
      evaluatorName: ev.evaluatorName,
      evaluatorColor: EVALUATOR_COLORS[colorIdx % EVALUATOR_COLORS.length],
    })
  }

  function handleSaved() {
    setEditTarget(null)
    router.refresh()
  }

  function sectionShortLabel(label: string) {
    if (label === "AL FAKHIR'S CORE VALUES") return "Core V."
    return label.split(" ")[0].charAt(0) + label.split(" ")[0].slice(1).toLowerCase()
  }

  return (
    <>
      {editTarget && (
        <QuickEditModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="card lg:col-span-3">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #DDE3EC" }}>
          <h2 className="font-semibold text-slate-800 text-sm">Penilaian per Penilai</h2>
          <span className="text-xs text-slate-400">{evaluations.length}/{allEvaluators.length} penilai</span>
        </div>

        {evaluations.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Belum ada penilaian</div>
        ) : (
          <div>
            {evaluations.map((e, idx) => {
              const total = calcTotal(e.parsedScores, sections)
              const g = getScoreGrade(total)
              const colorIdx = allEvaluators.findIndex((ev) => ev.id === e.evaluatorId)
              const color = EVALUATOR_COLORS[colorIdx % EVALUATOR_COLORS.length]
              return (
                <div
                  key={e.id}
                  className="p-5"
                  style={{
                    borderLeft: `3px solid ${color}`,
                    borderBottom: idx < evaluations.length - 1 ? "1px solid #EDF0F5" : "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {e.evaluatorName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-sm leading-snug truncate">{e.evaluatorName}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(e.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div>
                        <span className="text-lg font-bold" style={{ color: "#111827" }}>{total.toFixed(2)}</span>
                        <span className="text-xs text-slate-400">/4.00</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                          style={{ color: g.color, backgroundColor: g.bg }}
                        >
                          {g.label}
                        </span>
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded-lg border transition-colors hover:border-slate-300 hover:bg-slate-50"
                          style={{ borderColor: "#DDE3EC", color: "#94A3B8" }}
                          title="Edit penilaian"
                        >
                          <Edit size={13} />
                        </button>
                        <DeleteEvaluationButton evaluationId={e.id} teacherId={teacherId} />
                      </div>
                    </div>
                  </div>

                  {/* Section bars */}
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {sections.map((s) => {
                      const raw = calcSectionRaw(e.parsedScores, s.id, sections)
                      const norm = raw * 4 / s.maxScore
                      const pct = Math.round((raw / s.maxScore) * 100)
                      return (
                        <div key={s.id} className="text-center">
                          <div className="text-[9px] font-semibold uppercase tracking-wide mb-0.5 truncate leading-none" style={{ color: "#9CA3AF" }}>
                            {sectionShortLabel(s.label)}
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ backgroundColor: "#E2E8F0" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                          </div>
                          <div className="text-xs font-bold tabular-nums leading-none" style={{ color: "#111827" }}>
                            {norm.toFixed(1)}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {e.catatan && (
                    <div
                      className="mt-3 p-3 rounded-lg text-xs"
                      style={{ backgroundColor: "#F0F4F9", borderLeft: "3px solid #C4972A" }}
                    >
                      <p className="font-semibold mb-0.5" style={{ color: "#111827" }}>Catatan</p>
                      <p className="text-slate-600 leading-relaxed">{e.catatan}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
