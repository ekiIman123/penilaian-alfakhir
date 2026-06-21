"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowUpDown, SlidersHorizontal } from "lucide-react"
import { SECTIONS, EVALUATOR_COLORS } from "@/lib/rubrics"
import { RowActionsMenu } from "@/components/dashboard/row-actions"

// ── Types ─────────────────────────────────────────────────────────────────────

export type TeacherRow = {
  id: string
  name: string
  avgTotal: number | null
  grade: { label: string; color: string; bg: string } | null
  sectionAvgs: (number | null)[]
  ratedByEvaluatorIds: string[]
}

export type EvaluatorInfo = {
  id: string
  name: string
}

interface Props {
  teachers: TeacherRow[]
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
  { value: "all",        label: "Semua Grade"  },
  { value: "Sangat Baik", label: "Sangat Baik" },
  { value: "Baik",       label: "Baik"         },
  { value: "Cukup",      label: "Cukup"        },
  { value: "Kurang",     label: "Kurang"        },
]

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "score-desc", label: "Nilai ↓" },
  { value: "score-asc",  label: "Nilai ↑" },
  { value: "name-asc",   label: "Nama A–Z" },
  { value: "name-desc",  label: "Nama Z–A" },
]

const GRADE_COLORS: Record<string, { color: string; bg: string }> = {
  "Sangat Baik": { color: "#16A34A", bg: "#DCFCE7" },
  "Baik":        { color: "#2563EB", bg: "#DBEAFE" },
  "Cukup":       { color: "#D97706", bg: "#FEF3C7" },
  "Kurang":      { color: "#EA580C", bg: "#FFEDD5" },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EDE8E1" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
            style={
              active
                ? { backgroundColor: "#2C1A08", color: "#FFFFFF" }
                : { backgroundColor: "#F3EDE6", color: "#78716C" }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardTeacherList({ teachers, evaluators }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [gradeFilter, setGradeFilter]   = useState<GradeFilter>("all")
  const [sortBy, setSortBy]             = useState<SortBy>("score-desc")
  const [sortOpen, setSortOpen]         = useState(false)

  const totalEv = evaluators.length

  const filtered = useMemo(() => {
    let list = [...teachers]

    // Status filter
    if (statusFilter === "complete") {
      list = list.filter((t) => totalEv > 0 && t.ratedByEvaluatorIds.length === totalEv)
    } else if (statusFilter === "partial") {
      list = list.filter((t) => t.ratedByEvaluatorIds.length > 0 && t.ratedByEvaluatorIds.length < totalEv)
    } else if (statusFilter === "none") {
      list = list.filter((t) => t.ratedByEvaluatorIds.length === 0)
    }

    // Grade filter
    if (gradeFilter !== "all") {
      list = list.filter((t) => t.grade?.label === gradeFilter)
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "name-asc")  return a.name.localeCompare(b.name)
      if (sortBy === "name-desc") return b.name.localeCompare(a.name)
      if (sortBy === "score-asc") {
        if (a.avgTotal == null && b.avgTotal == null) return 0
        if (a.avgTotal == null) return -1
        if (b.avgTotal == null) return 1
        return a.avgTotal - b.avgTotal
      }
      // score-desc (default)
      if (a.avgTotal == null && b.avgTotal == null) return 0
      if (a.avgTotal == null) return 1
      if (b.avgTotal == null) return -1
      return b.avgTotal - a.avgTotal
    })

    return list
  }, [teachers, statusFilter, gradeFilter, sortBy, totalEv])

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (gradeFilter !== "all" ? 1 : 0)

  return (
    <div className="card">
      {/* ── Header ── */}
      <div className="px-5 py-4 flex flex-col gap-3" style={{ borderBottom: "1px solid #E7DDD0" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} style={{ color: "#9CA3AF" }} />
            <h2 className="font-bold text-gray-800">Rekapitulasi Penilaian Guru</h2>
            {activeFilterCount > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "#C4972A", color: "#FFFFFF" }}
              >
                {activeFilterCount} filter aktif
              </span>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                backgroundColor: sortBy !== "score-desc" ? "#2C1A08" : "#F3EDE6",
                color: sortBy !== "score-desc" ? "#FFFFFF" : "#78716C",
              }}
            >
              <ArrowUpDown size={12} />
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
              </span>
              <span className="sm:hidden">Urut</span>
            </button>
            {sortOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-xl py-1.5 shadow-lg"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E7DDD0",
                  minWidth: 140,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setSortOpen(false) }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold transition-colors"
                    style={{
                      color: sortBy === opt.value ? "#C4972A" : "#374151",
                      backgroundColor: sortBy === opt.value ? "#FEF3C7" : "transparent",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter pills — scrollable on mobile */}
        <div className="flex flex-col gap-2">
          {/* Status */}
          <div className="overflow-x-auto pb-0.5 -mb-0.5">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: "#9CA3AF" }}>
                Status
              </span>
              <PillGroup options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>

          {/* Grade */}
          <div className="overflow-x-auto pb-0.5 -mb-0.5">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: "#9CA3AF" }}>
                Grade
              </span>
              <PillGroup options={GRADE_OPTIONS} value={gradeFilter} onChange={setGradeFilter} />
            </div>
          </div>
        </div>

        {/* Evaluator legend */}
        {evaluators.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: "#9CA3AF" }}>
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

      {/* ── Rows ── */}
      <div className="divide-y" style={{ borderColor: "#F3EDE6" }}>
        {filtered.map((t, i) => {
          const ratedSet = new Set(t.ratedByEvaluatorIds)
          const completionCount = ratedSet.size
          const isComplete = totalEv > 0 && completionCount === totalEv
          const isPartial  = completionCount > 0 && !isComplete

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
                const rated = ratedSet.has(e.id)
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
                {completionCount}/{totalEv}
              </span>
            </div>
          )

          return (
            <div key={t.id} className="px-4 sm:px-5 py-4 hover:bg-amber-50/30 transition-colors">
              <div className="flex items-start gap-3 md:items-center md:gap-4">

                {/* Row number */}
                <div className="w-6 shrink-0 text-center pt-0.5 md:pt-0">
                  <span className="text-xs font-bold" style={{ color: "#C4C4C4" }}>
                    {i + 1}
                  </span>
                </div>

                {/* Name + dots + (mobile) score & actions */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/teachers/${t.id}`}
                      className="font-semibold text-sm hover:underline leading-snug"
                      style={{ color: "#1C1917" }}
                    >
                      {t.name}
                    </Link>
                    <div className="md:hidden shrink-0">{scoreEl}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    {dotsEl}
                    <div className="md:hidden flex items-center gap-1.5">
                      {gradeEl}
                      <RowActionsMenu teacherId={t.id} grade={t.grade ?? null} />
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
                      className="px-2.5 py-1 text-xs font-semibold text-white rounded-lg"
                      style={{ backgroundColor: "#5C3D11" }}
                    >
                      Detail
                    </Link>
                    <Link
                      href={`/form?teacherId=${t.id}`}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg"
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

        {/* Empty state — no data at all */}
        {teachers.length === 0 && (
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

        {/* Empty state — filters active but no match */}
        {teachers.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-medium" style={{ color: "#78716C" }}>
              Tidak ada guru yang sesuai filter
            </p>
            <button
              onClick={() => { setStatusFilter("all"); setGradeFilter("all") }}
              className="px-4 py-1.5 text-xs font-bold rounded-lg"
              style={{ backgroundColor: "#F3EDE6", color: "#5C3D11" }}
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
