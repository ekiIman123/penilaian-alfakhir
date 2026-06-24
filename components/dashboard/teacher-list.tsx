"use client"

import { useState, useMemo, useRef, useEffect, Fragment } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronDown, GraduationCap, Search, X, Save, Loader2 } from "lucide-react"
import { SECTIONS, STAFF_SECTIONS, getSectionsForRole, EVALUATOR_COLORS, getScoreGrade } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw } from "@/lib/calculations"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────────

export type EvalSummary = {
  evaluatorId: string
  evaluatorName: string
  total: number
  grade: { label: string; color: string; bg: string }
  sectionNorms: number[]
}

export type TeacherRow = {
  id: string
  name: string
  role: string
  avgTotal: number | null
  grade: { label: string; color: string; bg: string } | null
  sectionAvgs: (number | null)[]
  ratedByEvaluatorIds: string[]
  evaluationSummaries: EvalSummary[]
}

export type EvaluatorInfo = {
  id: string
  name: string
}

interface Props {
  guruTeachers: TeacherRow[]
  staffTeachers: TeacherRow[]
  evaluators: EvaluatorInfo[]
}

// ── Filter config ──────────────────────────────────────────────────────────────

type StatusFilter = "all" | "complete" | "partial" | "none"
type GradeFilter  = "all" | "Sangat Baik" | "Baik" | "Cukup" | "Kurang"
type SortBy       = "score-desc" | "score-asc" | "name-asc" | "name-desc"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all",      label: "Semua"    },
  { value: "complete", label: "Selesai"  },
  { value: "partial",  label: "Sebagian" },
  { value: "none",     label: "Belum"    },
]

const GRADE_OPTIONS: { value: GradeFilter; label: string }[] = [
  { value: "all",         label: "Semua Grade" },
  { value: "Sangat Baik", label: "Sangat Baik" },
  { value: "Baik",        label: "Baik"         },
  { value: "Cukup",       label: "Cukup"        },
  { value: "Kurang",      label: "Kurang"       },
]

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "score-desc", label: "Nilai ↓"  },
  { value: "score-asc",  label: "Nilai ↑"  },
  { value: "name-asc",   label: "Nama A–Z" },
  { value: "name-desc",  label: "Nama Z–A" },
]

// ── FilterDropdown ─────────────────────────────────────────────────────────────

function FilterDropdown<T extends string>({
  label, options, value, defaultValue, onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  defaultValue: T
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = value !== defaultValue
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
        style={{
          backgroundColor: isActive ? "#0F2540" : "#EDF0F5",
          color: isActive ? "#FFFFFF" : "#64748B",
          border: isActive ? "1px solid transparent" : "1px solid #DDE3EC",
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{label}</span>
        <span>{current?.label}</span>
        <ChevronDown size={11} style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-30 rounded-lg py-1"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #DDE3EC", minWidth: "100%", boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap"
              style={{ color: value === opt.value ? "#C4972A" : "#374151", backgroundColor: value === opt.value ? "#FEF9EC" : "transparent" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Quick Edit Modal ───────────────────────────────────────────────────────────

type EditTarget = {
  teacherId: string
  teacherName: string
  role: string
  evaluatorId: string
  evaluatorName: string
  evaluatorColor: string
}

function QuickEditModal({
  target, onClose, onSaved,
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
            sections.map((section) => {
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
            })
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

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardTeacherList({ guruTeachers, staffTeachers, evaluators }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"guru" | "staff">("guru")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [gradeFilter,  setGradeFilter]  = useState<GradeFilter>("all")
  const [sortBy,       setSortBy]       = useState<SortBy>("score-desc")
  const [editTarget,   setEditTarget]   = useState<EditTarget | null>(null)
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set())

  function switchTab(tab: "guru" | "staff") {
    setActiveTab(tab)
    setExpandedIds(new Set())
    setStatusFilter("all")
    setGradeFilter("all")
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const activeSections = activeTab === "guru" ? SECTIONS : STAFF_SECTIONS
  const activeTeachers = activeTab === "guru" ? guruTeachers : staffTeachers
  const totalEv = evaluators.length

  const filtered = useMemo(() => {
    let list = [...activeTeachers]

    if (statusFilter === "complete") {
      list = list.filter((t) => totalEv > 0 && t.ratedByEvaluatorIds.length === totalEv)
    } else if (statusFilter === "partial") {
      list = list.filter((t) => t.ratedByEvaluatorIds.length > 0 && t.ratedByEvaluatorIds.length < totalEv)
    } else if (statusFilter === "none") {
      list = list.filter((t) => t.ratedByEvaluatorIds.length === 0)
    }

    if (gradeFilter !== "all") {
      list = list.filter((t) => t.grade?.label === gradeFilter)
    }

    list.sort((a, b) => {
      if (sortBy === "name-asc")  return a.name.localeCompare(b.name)
      if (sortBy === "name-desc") return b.name.localeCompare(a.name)
      if (sortBy === "score-asc") {
        if (a.avgTotal == null && b.avgTotal == null) return 0
        if (a.avgTotal == null) return -1
        if (b.avgTotal == null) return 1
        return a.avgTotal - b.avgTotal
      }
      if (a.avgTotal == null && b.avgTotal == null) return 0
      if (a.avgTotal == null) return 1
      if (b.avgTotal == null) return -1
      return b.avgTotal - a.avgTotal
    })

    return list
  }, [activeTeachers, statusFilter, gradeFilter, sortBy, totalEv])

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (gradeFilter !== "all" ? 1 : 0)

  function openEdit(teacherId: string, teacherName: string, role: string, evaluatorId: string, evaluatorIdx: number) {
    const ev = evaluators.find((e) => e.id === evaluatorId)
    if (!ev) return
    setEditTarget({
      teacherId,
      teacherName,
      role,
      evaluatorId,
      evaluatorName: ev.name,
      evaluatorColor: EVALUATOR_COLORS[evaluatorIdx % EVALUATOR_COLORS.length],
    })
  }

  function handleSaved() {
    setEditTarget(null)
    router.refresh()
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

      <div className="card">
        {/* ── Header ── */}
        <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
          <h2 className="font-semibold text-slate-800 shrink-0 text-sm">Rekapitulasi Penilaian</h2>
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            <FilterDropdown label="Status"  options={STATUS_OPTIONS} value={statusFilter} defaultValue="all"        onChange={setStatusFilter} />
            <FilterDropdown label="Grade"   options={GRADE_OPTIONS}  value={gradeFilter}  defaultValue="all"        onChange={setGradeFilter}  />
            <FilterDropdown label="Urutan"  options={SORT_OPTIONS}   value={sortBy}       defaultValue="score-desc" onChange={setSortBy}       />
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter("all"); setGradeFilter("all") }}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="px-5 pt-3 pb-0 flex items-center gap-2">
          <button
            onClick={() => switchTab("guru")}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={
              activeTab === "guru"
                ? { backgroundColor: "#0F2540", color: "#FFFFFF" }
                : { backgroundColor: "#EDF0F5", color: "#64748B" }
            }
          >
            Guru ({guruTeachers.length})
          </button>
          <button
            onClick={() => switchTab("staff")}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={
              activeTab === "staff"
                ? { backgroundColor: "#0F2540", color: "#FFFFFF" }
                : { backgroundColor: "#EDF0F5", color: "#64748B" }
            }
          >
            Staf ({staffTeachers.length})
          </button>
        </div>

        {/* ── Table ── */}
        {activeTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EDF0F5" }}>
              <GraduationCap size={22} style={{ color: "#94A3B8" }} />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {activeTab === "guru" ? "Belum ada data guru" : "Belum ada data staf"}
            </p>
            <Link href="/admin" className="px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: "#1E3A5F" }}>
              Kelola Data Master
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EDF0F5" }}>
              <Search size={18} style={{ color: "#94A3B8" }} />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {activeTab === "guru" ? "Tidak ada guru yang sesuai filter" : "Tidak ada staf yang sesuai filter"}
            </p>
            <button
              onClick={() => { setStatusFilter("all"); setGradeFilter("all") }}
              className="px-4 py-1.5 text-xs font-medium rounded-lg"
              style={{ backgroundColor: "#EDF0F5", color: "#1E3A5F" }}
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "680px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F1F4F8", borderBottom: "2px solid #DDE3EC" }}>
                  {/* chevron + rank */}
                  <th style={{ width: "1.75rem" }} />
                  <th
                    className="py-2.5 text-[10px] font-bold uppercase tracking-widest text-center"
                    style={{ color: "#94A3B8", width: "2rem" }}
                  >#</th>
                  {/* name */}
                  <th
                    className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "#94A3B8" }}
                  >{activeTab === "guru" ? "Nama Guru" : "Nama Staf"}</th>
                  {/* 5 section columns */}
                  {activeSections.map((s) => (
                    <th
                      key={s.id}
                      className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: s.color, width: "5.5rem" }}
                    >
                      {s.label === "AL FAKHIR'S CORE VALUES"
                        ? "Core Values"
                        : s.label.charAt(0) + s.label.slice(1).toLowerCase()}
                    </th>
                  ))}
                  {/* penilai dots */}
                  <th
                    className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "#94A3B8", width: "5rem" }}
                  >Penilai</th>
                  {/* nilai */}
                  <th
                    className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "#94A3B8", width: "7.5rem" }}
                  >Nilai</th>
                  {/* action */}
                  <th style={{ width: "4.5rem" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const ratedSet = new Set(t.ratedByEvaluatorIds)
                  const isExpanded = expandedIds.has(t.id)
                  // colspan = chevron + rank + name + 5 sections + penilai + nilai + action = 10
                  const COLSPAN = 10

                  return (
                    <Fragment key={t.id}>
                      {/* ── Main row ── */}
                      <tr
                        onClick={() => toggleExpand(t.id)}
                        className="hover:bg-slate-50/70 transition-colors"
                        style={{ borderBottom: isExpanded ? "none" : "1px solid #EDF0F5", cursor: "pointer" }}
                      >
                        {/* Chevron */}
                        <td className="pl-3 pr-1 py-3 text-center" style={{ width: "1.75rem" }}>
                          <ChevronDown
                            size={13}
                            className="transition-transform duration-200 inline-block"
                            style={{ color: "#94A3B8", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                          />
                        </td>

                        {/* Rank */}
                        <td className="py-3 text-center">
                          <span className="text-xs font-medium tabular-nums" style={{ color: "#CBD5E1" }}>{i + 1}</span>
                        </td>

                        {/* Name */}
                        <td className="px-3 py-3">
                          <Link
                            href={`/teachers/${t.id}`}
                            className="font-semibold text-sm hover:underline"
                            style={{ color: "#1A2233" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.name}
                          </Link>
                        </td>

                        {/* 5 section avg columns */}
                        {activeSections.map((s, si) => {
                          const avg = t.sectionAvgs[si]
                          const norm = avg != null ? (avg * 4) / s.maxScore : null
                          return (
                            <td key={s.id} className="px-2 py-3 text-center">
                              <span
                                className="text-xs font-bold tabular-nums"
                                style={{ color: norm != null ? s.color : "#DDE3EC" }}
                              >
                                {norm != null ? norm.toFixed(1) : "—"}
                              </span>
                            </td>
                          )
                        })}

                        {/* Evaluator dots */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {evaluators.map((ev, ei) => {
                              const color = EVALUATOR_COLORS[ei % EVALUATOR_COLORS.length]
                              const rated = ratedSet.has(ev.id)
                              return (
                                <div
                                  key={ev.id}
                                  title={`${ev.name.split(",")[0]}: ${rated ? "Sudah menilai" : "Belum menilai"}`}
                                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0"
                                  style={
                                    rated
                                      ? { backgroundColor: color, color: "#fff", fontSize: "8px" }
                                      : { border: `1.5px dashed ${color}80`, color: `${color}80`, fontSize: "8px", backgroundColor: "transparent" }
                                  }
                                >
                                  {ev.name.charAt(0).toUpperCase()}
                                </div>
                              )
                            })}
                          </div>
                        </td>

                        {/* Score + grade */}
                        <td className="px-3 py-3 text-right">
                          {t.avgTotal != null ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-base font-bold tabular-nums leading-none" style={{ color: t.grade?.color }}>
                                {t.avgTotal.toFixed(2)}
                              </span>
                              {t.grade && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                                  style={{ color: t.grade.color, backgroundColor: t.grade.bg }}
                                >
                                  {t.grade.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: "#CBD5E1" }}>Belum dinilai</span>
                          )}
                        </td>

                        {/* Detail button */}
                        <td className="pr-3 py-3 text-center">
                          <Link
                            href={`/teachers/${t.id}`}
                            className="inline-flex text-xs font-medium px-2.5 py-1 rounded-md text-white whitespace-nowrap"
                            style={{ backgroundColor: "#1E3A5F" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Detail
                          </Link>
                        </td>
                      </tr>

                      {/* ── Expanded nested table row ── */}
                      {isExpanded && (
                        <tr style={{ borderBottom: "1px solid #EDF0F5" }}>
                          <td colSpan={COLSPAN} style={{ padding: "0 1rem 1rem 2.5rem", backgroundColor: "#FAFBFD" }}>
                            <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #DDE3EC" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "520px" }}>
                                <thead>
                                  <tr style={{ backgroundColor: "#F1F4F8", borderBottom: "1px solid #DDE3EC" }}>
                                    <th className="text-left pl-3 pr-2 py-2 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: "#94A3B8", width: "7rem" }}>Penilai</th>
                                    {activeSections.map((s) => (
                                      <th key={s.id} className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: s.color }}>
                                        {s.label === "AL FAKHIR'S CORE VALUES" ? "Core Values" : s.label.charAt(0) + s.label.slice(1).toLowerCase()}
                                      </th>
                                    ))}
                                    <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8", width: "5.5rem" }}>Total</th>
                                    <th style={{ width: "4.5rem" }} />
                                  </tr>
                                </thead>
                                <tbody>
                                  {evaluators.map((ev, ei) => {
                                    const color = EVALUATOR_COLORS[ei % EVALUATOR_COLORS.length]
                                    const summary = t.evaluationSummaries.find((s) => s.evaluatorId === ev.id)
                                    return (
                                      <tr key={ev.id} style={{ borderTop: "1px solid #EDF0F5", backgroundColor: "#FFFFFF" }}>
                                        <td className="pl-3 pr-2 py-2">
                                          <div className="flex items-center gap-1.5">
                                            <div
                                              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                                              style={{ backgroundColor: color, fontSize: "9px" }}
                                            >
                                              {ev.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs text-slate-500 whitespace-nowrap">{ev.name.split(",")[0].split(" ")[0]}</span>
                                          </div>
                                        </td>
                                        {summary ? (
                                          activeSections.map((s, si) => (
                                            <td key={s.id} className="px-2 py-2 text-center">
                                              <span className="text-xs font-semibold tabular-nums" style={{ color: s.color }}>
                                                {summary.sectionNorms[si].toFixed(1)}
                                              </span>
                                            </td>
                                          ))
                                        ) : (
                                          activeSections.map((s) => (
                                            <td key={s.id} className="px-2 py-2 text-center">
                                              <span className="text-xs" style={{ color: "#DDE3EC" }}>—</span>
                                            </td>
                                          ))
                                        )}
                                        <td className="px-2 py-2 text-center">
                                          {summary ? (
                                            <div className="flex items-center justify-center gap-1">
                                              <span className="text-sm font-bold tabular-nums" style={{ color: summary.grade.color }}>
                                                {summary.total.toFixed(2)}
                                              </span>
                                              <span
                                                className="text-[9px] font-semibold px-1 py-0.5 rounded-full"
                                                style={{ color: summary.grade.color, backgroundColor: summary.grade.bg }}
                                              >
                                                {summary.grade.label}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-xs" style={{ color: "#DDE3EC" }}>—</span>
                                          )}
                                        </td>
                                        <td className="pr-3 py-2 text-center">
                                          <button
                                            onClick={() => openEdit(t.id, t.name, t.role, ev.id, ei)}
                                            className="text-[10px] font-semibold px-2 py-1 rounded-md transition-opacity hover:opacity-80 whitespace-nowrap"
                                            style={
                                              summary
                                                ? { backgroundColor: "#EDF0F5", color: "#1E3A5F" }
                                                : { backgroundColor: "rgba(196,151,42,0.10)", color: "#C4972A", border: "1px solid rgba(196,151,42,0.25)" }
                                            }
                                          >
                                            {summary ? "Edit" : "+ Nilai"}
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}

                                  {/* Rata-rata row */}
                                  {t.evaluationSummaries.length > 0 && (
                                    <tr style={{ borderTop: "2px solid #DDE3EC", backgroundColor: "#F8FAFC" }}>
                                      <td className="pl-3 pr-2 py-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Rata-rata</span>
                                      </td>
                                      {activeSections.map((s, si) => {
                                        const avg = t.sectionAvgs[si]
                                        const norm = avg != null ? avg * 4 / s.maxScore : null
                                        return (
                                          <td key={s.id} className="px-2 py-2 text-center">
                                            <span className="text-xs font-bold tabular-nums" style={{ color: norm != null ? s.color : "#DDE3EC" }}>
                                              {norm != null ? norm.toFixed(1) : "—"}
                                            </span>
                                          </td>
                                        )
                                      })}
                                      <td className="px-2 py-2 text-center">
                                        {t.avgTotal != null && t.grade ? (
                                          <div className="flex items-center justify-center gap-1">
                                            <span className="text-sm font-bold tabular-nums" style={{ color: t.grade.color }}>
                                              {t.avgTotal.toFixed(2)}
                                            </span>
                                            <span
                                              className="text-[9px] font-semibold px-1 py-0.5 rounded-full"
                                              style={{ color: t.grade.color, backgroundColor: t.grade.bg }}
                                            >
                                              {t.grade.label}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-xs" style={{ color: "#DDE3EC" }}>—</span>
                                        )}
                                      </td>
                                      <td />
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
