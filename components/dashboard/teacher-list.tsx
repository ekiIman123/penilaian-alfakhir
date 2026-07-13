"use client"

import { useState, useMemo, useRef, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronDown, GraduationCap, Search, Loader2, Printer, FileText, FolderOpen } from "lucide-react"
import { SECTIONS, STAFF_SECTIONS, EVALUATOR_COLORS, getScoreGrade } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw } from "@/lib/calculations"
import { toast } from "sonner"
import { QuickEditModal, type EditTarget } from "@/components/quick-edit-modal"

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

// ── Bulk Download Button ───────────────────────────────────────────────────────

type BulkRole   = "guru" | "staff" | "all"
type BulkFormat = "pdf" | "zip"

function BulkDownloadButton({
  guruCount,
  staffCount,
  activeTab,
}: {
  guruCount: number
  staffCount: number
  activeTab: "guru" | "staff"
}) {
  const [open,    setOpen]    = useState(false)
  const [format,  setFormat]  = useState<BulkFormat>("pdf")
  const [loading, setLoading] = useState<BulkRole | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function download(role: BulkRole) {
    setOpen(false)
    setLoading(role)
    const count    = role === "all" ? guruCount + staffCount : role === "guru" ? guruCount : staffCount
    const label    = role === "all" ? "Semua" : role === "guru" ? "Guru" : "Staf"
    const isPdf    = format === "pdf"
    const year     = new Date().getFullYear()
    const filename = isPdf
      ? `rapor-massal-${role}-${year}.pdf`
      : `rapor-${role}-${year}.zip`

    const toastId = toast.loading(
      isPdf
        ? `Membuat 1 PDF untuk ${count} rapor ${label}…`
        : `Membuat ${count} file PDF terpisah dalam ZIP…`
    )
    try {
      const res = await fetch(`/api/reports/bulk?role=${role}&format=${format}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(
        isPdf
          ? `PDF ${count} rapor ${label} berhasil diunduh`
          : `ZIP ${count} file rapor ${label} berhasil diunduh`,
        { id: toastId }
      )
    } catch {
      toast.error("Gagal mengunduh rapor, coba lagi", { id: toastId })
    } finally {
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  const dataOptions: { role: BulkRole; label: string; count: number }[] = [
    { role: "guru",  label: "Guru",  count: guruCount  },
    { role: "staff", label: "Staf",  count: staffCount },
    { role: "all",   label: "Semua", count: guruCount + staffCount },
  ]

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => !isLoading && setOpen((o) => !o)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-60"
        style={{ backgroundColor: "#0F2540", color: "#FFFFFF", boxShadow: "0 1px 4px rgba(15,37,64,0.18)" }}
      >
        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
        {isLoading ? "Memproses…" : "Cetak Massal"}
        {!isLoading && (
          <ChevronDown size={10} style={{ opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-30 rounded-xl"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #DDE3EC", width: 232, boxShadow: "0 8px 28px rgba(0,0,0,0.13)" }}
        >
          {/* Header */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #DDE3EC" }}>
            <p className="text-xs font-bold" style={{ color: "#1A2233" }}>Ekspor Rapor Massal</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>Pilih format lalu pilih data</p>
          </div>

          {/* Format toggle */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#94A3B8" }}>Format</p>
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #DDE3EC" }}>
              <button
                onClick={() => setFormat("pdf")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors"
                style={
                  format === "pdf"
                    ? { backgroundColor: "#0F2540", color: "#FFFFFF" }
                    : { backgroundColor: "transparent", color: "#64748B" }
                }
              >
                <FileText size={11} />
                1 File PDF
              </button>
              <button
                onClick={() => setFormat("zip")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors"
                style={
                  format === "zip"
                    ? { backgroundColor: "#0F2540", color: "#FFFFFF" }
                    : { backgroundColor: "transparent", color: "#64748B" }
                }
              >
                <FolderOpen size={11} />
                File Terpisah
              </button>
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: "#94A3B8" }}>
              {format === "pdf"
                ? "Semua rapor dalam 1 PDF multi-halaman"
                : "Setiap rapor jadi file PDF terpisah (.zip)"}
            </p>
          </div>

          {/* Data picker */}
          <div className="px-4 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#94A3B8" }}>Pilih Data</p>
            <div className="flex gap-1.5">
              {dataOptions.map((opt) => (
                <button
                  key={opt.role}
                  onClick={() => download(opt.role)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-[11px] font-semibold transition-colors"
                  style={
                    opt.role === activeTab
                      ? { backgroundColor: "#FEF9EC", color: "#C4972A", border: "1px solid #E8B84B" }
                      : { backgroundColor: "#F1F4F8", color: "#374151", border: "1px solid transparent" }
                  }
                >
                  <span>{opt.label}</span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: opt.role === activeTab ? "#C4972A" : "#94A3B8" }}
                  >
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardTeacherList({ guruTeachers, staffTeachers, evaluators }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"guru" | "staff">("guru")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [gradeFilter,  setGradeFilter]  = useState<GradeFilter>("all")
  const [sortBy,       setSortBy]       = useState<SortBy>("score-desc")
  const [editTarget,  setEditTarget]  = useState<EditTarget | null>(null)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  function switchTab(tab: "guru" | "staff") {
    setActiveTab(tab)
    setExpandedId(null)
    setStatusFilter("all")
    setGradeFilter("all")
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
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

        {/* ── Tabs + Bulk Download ── */}
        <div className="px-5 pt-3 pb-3 sm:pb-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
          <BulkDownloadButton
            guruCount={guruTeachers.length}
            staffCount={staffTeachers.length}
            activeTab={activeTab}
          />
        </div>

        {/* ── Table — always rendered ── */}
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "680px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F1F4F8", borderBottom: "2px solid #DDE3EC" }}>
                <th style={{ width: "1.75rem" }} />
                <th
                  className="py-2.5 text-[10px] font-bold uppercase tracking-widest text-center"
                  style={{ color: "#6B7280", width: "2rem" }}
                >#</th>
                <th
                  className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "#6B7280" }}
                >{activeTab === "guru" ? "Nama Guru" : "Nama Staf"}</th>
                {activeSections.map((s) => (
                  <th
                    key={s.id}
                    className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "#6B7280", width: "5.5rem" }}
                  >
                    {s.label === "AL FAKHIR'S CORE VALUES"
                      ? "Core Values"
                      : s.label.charAt(0) + s.label.slice(1).toLowerCase()}
                  </th>
                ))}
                <th
                  className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "#6B7280", width: "5rem" }}
                >Penilai</th>
                <th
                  className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "#6B7280", width: "7.5rem" }}
                >Nilai</th>
                <th style={{ width: "4.5rem" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14">
                    {activeTeachers.length === 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EDF0F5" }}>
                          <GraduationCap size={18} style={{ color: "#94A3B8" }} />
                        </div>
                        <p className="text-sm text-slate-400">
                          {activeTab === "guru" ? "Belum ada data guru" : "Belum ada data staf"}
                        </p>
                        <Link href="/alfakhir/admin" className="px-4 py-1.5 text-xs font-medium rounded-lg text-white" style={{ backgroundColor: "#1E3A5F" }}>
                          Kelola Data Master
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EDF0F5" }}>
                          <Search size={18} style={{ color: "#94A3B8" }} />
                        </div>
                        <p className="text-sm text-slate-400">Tidak ada data yang sesuai filter</p>
                        <button
                          onClick={() => { setStatusFilter("all"); setGradeFilter("all") }}
                          className="px-4 py-1.5 text-xs font-medium rounded-lg"
                          style={{ backgroundColor: "#EDF0F5", color: "#374151" }}
                        >
                          Reset Filter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => {
                  const ratedSet = new Set(t.ratedByEvaluatorIds)
                  const isExpanded = expandedId === t.id
                  const COLSPAN = 10

                  return (
                    <Fragment key={t.id}>
                      {/* ── Main row ── */}
                      <tr
                        onClick={() => toggleExpand(t.id)}
                        className="tr-hover"
                        style={{ borderBottom: isExpanded ? "none" : "1px solid #EDF0F5", cursor: "pointer" }}
                      >
                        {/* Chevron */}
                        <td className="pl-3 pr-1 py-3 text-center" style={{ width: "1.75rem" }}>
                          <ChevronDown
                            size={13}
                            className="transition-transform duration-200 inline-block"
                            style={{ color: "#9CA3AF", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                          />
                        </td>

                        {/* Rank */}
                        <td className="py-3 text-center">
                          <span className="text-xs font-medium tabular-nums" style={{ color: "#9CA3AF" }}>{i + 1}</span>
                        </td>

                        {/* Name */}
                        <td className="px-3 py-3">
                          <Link
                            href={`/alfakhir/teachers/${t.id}`}
                            className="font-semibold text-sm hover:underline"
                            style={{ color: "#111827" }}
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
                                style={{ color: norm != null ? "#111827" : "#D1D5DB" }}
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
                              const rated = ratedSet.has(ev.id)
                              return (
                                <div
                                  key={ev.id}
                                  title={`${ev.name.split(",")[0]}: ${rated ? "Sudah menilai" : "Belum menilai"}`}
                                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0"
                                  style={
                                    rated
                                      ? { backgroundColor: "#1E3A5F", color: "#fff", fontSize: "8px" }
                                      : { border: "1.5px dashed #CBD5E1", color: "#CBD5E1", fontSize: "8px", backgroundColor: "transparent" }
                                  }
                                >
                                  {ev.name.charAt(0).toUpperCase()}
                                </div>
                              )
                            })}
                          </div>
                        </td>

                        {/* Score + grade badge */}
                        <td className="px-3 py-3 text-right">
                          {t.avgTotal != null ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-base font-bold tabular-nums leading-none" style={{ color: "#111827" }}>
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
                            <span className="text-xs" style={{ color: "#D1D5DB" }}>Belum dinilai</span>
                          )}
                        </td>

                        {/* Detail button */}
                        <td className="pr-3 py-3 text-center">
                          <Link
                            href={`/alfakhir/teachers/${t.id}`}
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
                          <td colSpan={COLSPAN} style={{ padding: "0 1rem 1rem 3.75rem", backgroundColor: "#FAFBFD" }}>
                            <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #DDE3EC" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "520px" }}>
                                <thead>
                                  <tr style={{ backgroundColor: "#F1F4F8", borderBottom: "1px solid #DDE3EC" }}>
                                    <th className="text-left pl-3 pr-2 py-2 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: "#6B7280" }}>Penilai</th>
                                    {activeSections.map((s) => (
                                      <th key={s.id} className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: "#6B7280", width: "5.5rem" }}>
                                        {s.label === "AL FAKHIR'S CORE VALUES" ? "Core Values" : s.label.charAt(0) + s.label.slice(1).toLowerCase()}
                                      </th>
                                    ))}
                                    <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: "#6B7280", width: "11.5rem" }}>Total</th>
                                    <th style={{ width: "4.5rem" }} />
                                  </tr>
                                </thead>
                                <tbody>
                                  {evaluators.map((ev, ei) => {
                                    const color = EVALUATOR_COLORS[ei % EVALUATOR_COLORS.length]
                                    const summary = t.evaluationSummaries.find((s) => s.evaluatorId === ev.id)
                                    return (
                                      <tr key={ev.id} className="tr-hover" style={{ borderTop: "1px solid #EDF0F5" }}>
                                        <td className="pl-3 pr-2 py-2">
                                          <div className="flex items-center gap-1.5">
                                            <div
                                              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                                              style={{ backgroundColor: color, fontSize: "9px" }}
                                            >
                                              {ev.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs whitespace-nowrap" style={{ color: "#374151" }}>{ev.name.split(",")[0].split(" ")[0]}</span>
                                          </div>
                                        </td>
                                        {summary ? (
                                          activeSections.map((s, si) => (
                                            <td key={s.id} className="px-2 py-2 text-center">
                                              <span className="text-xs font-semibold tabular-nums" style={{ color: "#111827" }}>
                                                {summary.sectionNorms[si].toFixed(1)}
                                              </span>
                                            </td>
                                          ))
                                        ) : (
                                          activeSections.map((s) => (
                                            <td key={s.id} className="px-2 py-2 text-center">
                                              <span className="text-xs" style={{ color: "#D1D5DB" }}>—</span>
                                            </td>
                                          ))
                                        )}
                                        <td className="px-2 py-2 text-center">
                                          {summary ? (
                                            <div className="flex items-center justify-center gap-1">
                                              <span className="text-sm font-bold tabular-nums" style={{ color: "#111827" }}>
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
                                            <span className="text-xs" style={{ color: "#D1D5DB" }}>—</span>
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
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>Rata-rata</span>
                                      </td>
                                      {activeSections.map((s, si) => {
                                        const avg = t.sectionAvgs[si]
                                        const norm = avg != null ? avg * 4 / s.maxScore : null
                                        return (
                                          <td key={s.id} className="px-2 py-2 text-center">
                                            <span className="text-xs font-bold tabular-nums" style={{ color: norm != null ? "#111827" : "#D1D5DB" }}>
                                              {norm != null ? norm.toFixed(1) : "—"}
                                            </span>
                                          </td>
                                        )
                                      })}
                                      <td className="px-2 py-2 text-center">
                                        {t.avgTotal != null && t.grade ? (
                                          <div className="flex items-center justify-center gap-1">
                                            <span className="text-sm font-bold tabular-nums" style={{ color: "#111827" }}>
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
                                          <span className="text-xs" style={{ color: "#D1D5DB" }}>—</span>
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
