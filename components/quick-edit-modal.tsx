"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Save, Loader2 } from "lucide-react"
import { getSectionsForRole, getScoreGrade } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw } from "@/lib/calculations"
import { toast } from "sonner"

export type EditTarget = {
  teacherId: string
  teacherName: string
  role: string
  evaluatorId: string
  evaluatorName: string
  evaluatorColor: string
}

export function QuickEditModal({
  target,
  onClose,
  onSaved,
}: {
  target: EditTarget
  onClose: () => void
  onSaved: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [catatan, setCatatan] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const sections = getSectionsForRole(target.role)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/evaluations?teacherId=${target.teacherId}&evaluatorId=${target.evaluatorId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.scores) setScores(data.scores)
        setCatatan(data?.catatan ?? "")
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [target.teacherId, target.evaluatorId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const allCriteria = sections.flatMap((s) => s.criteria)
  const filledCount = allCriteria.filter((c) => (scores[c.id] ?? 0) > 0).length
  const total = filledCount === allCriteria.length ? calcTotal(scores, sections) : null
  const grade = total != null ? getScoreGrade(total) : null

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: target.teacherId,
          evaluatorId: target.evaluatorId,
          scores,
          catatan: catatan || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Penilaian berhasil disimpan")
      onSaved()
    } catch {
      toast.error("Gagal menyimpan penilaian")
      setSaving(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.30)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)" }}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
              Edit Penilaian
            </div>
            <div className="font-semibold text-white text-sm leading-snug truncate">{target.teacherName}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={{ backgroundColor: target.evaluatorColor, fontSize: "8px" }}
              >
                {target.evaluatorName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                {target.evaluatorName.split(",")[0]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {grade && (
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums leading-none" style={{ color: "#E8B84B" }}>
                  {total!.toFixed(2)}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{grade.label}</div>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              <X size={14} color="white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin" style={{ color: "#94A3B8" }} />
            </div>
          ) : (
            <>
              {sections.map((section) => {
                const raw  = calcSectionRaw(scores, section.id, sections)
                const norm = raw * 4 / section.maxScore
                return (
                  <div key={section.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: section.color }}>
                          {section.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: section.color }}>
                        {norm.toFixed(1)}<span className="font-normal opacity-50"> / 4</span>
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {section.criteria.map((criterion) => {
                        const cur = scores[criterion.id] ?? 0
                        return (
                          <div
                            key={criterion.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{ backgroundColor: "#F8FAFC", border: "1px solid #EDF0F5" }}
                          >
                            <span className="text-xs text-slate-600 flex-1 leading-snug">{criterion.label}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {([1, 2, 3, 4] as const).map((score) => (
                                <button
                                  key={score}
                                  onClick={() => setScores((prev) => ({ ...prev, [criterion.id]: score }))}
                                  className="w-7 h-7 rounded-md text-xs font-bold transition-all"
                                  style={
                                    cur === score
                                      ? { backgroundColor: section.color, color: "#fff" }
                                      : { backgroundColor: "#EDF0F5", color: "#94A3B8" }
                                  }
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Catatan */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#94A3B8" }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>
                    Catatan
                  </span>
                </div>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tambahkan catatan evaluasi (opsional)…"
                  rows={3}
                  className="w-full text-xs rounded-lg px-3 py-2 resize-none outline-none transition-colors"
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #DDE3EC",
                    color: "#374151",
                    lineHeight: "1.6",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1E3A5F")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#DDE3EC")}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex items-center justify-between gap-3 shrink-0"
          style={{ borderTop: "1px solid #DDE3EC", backgroundColor: "#F8FAFC" }}
        >
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            {filledCount}/{allCriteria.length} kriteria diisi
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-slate-100"
              style={{ color: "#64748B" }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#1E3A5F" }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
