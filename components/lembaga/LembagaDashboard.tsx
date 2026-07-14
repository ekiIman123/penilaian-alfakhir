"use client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, PenLine, LogOut, User2,
  Clock, Search, ChevronDown, X, ChevronRight, Plus,
} from "lucide-react"
import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import type { EvaluateeRowData, EvalSummary } from "@/lib/lembaga-dashboard-data"
import { LembagaEvalModal, type LembagaEditTarget } from "./LembagaEvalModal"

export type { EvaluateeRowData }

// Short display names for each section column header (A-G = AG_SECTIONS[0-6])
const SECTION_NAMES = [
  "Disiplin",
  "Loyalitas",
  "Komitmen",
  "Jujur & Amanah",
  "Persatuan",
  "Leadership",
  "Manajemen Tim",
]

interface Props {
  lembagaSlug: "iysa" | "icgi" | "iyora"
  lembagaLabel: string
  session: { evaluatorId: string; name: string; role: string; divisi: string | null }
  evaluatees: EvaluateeRowData[]
}

const ROLE_LABEL: Record<string, string> = {
  staff:       "Staff",
  koordinator: "Koordinator",
  supervisor:  "Supervisor",
  ceo:         "CEO",
  pm:          "Project Manager",
  management:  "Management",
  founder:     "General Manager",
  superadmin:  "Super Admin",
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  koordinator: { bg: "#DDD6FE", color: "#4C1D95" },
  supervisor:  { bg: "#BFDBFE", color: "#1E3A8A" },
  ceo:         { bg: "#FECACA", color: "#991B1B" },
  pm:          { bg: "#A7F3D0", color: "#064E3B" },
  staff:       { bg: "#C7D2FE", color: "#3730A3" },
  founder:     { bg: "#FDE68A", color: "#78350F" },
  management:  { bg: "#E5E7EB", color: "#1F2937" },
  superadmin:  { bg: "#E9D5FF", color: "#6B21A8" },
}

type StatusFilter = "all" | "done" | "pending"
type SortBy = "name-asc" | "name-desc" | "score-high" | "score-low" | "status-done" | "status-pending"

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
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
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
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #DDE3EC", minWidth: "120px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap"
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

function ScoreCell({ score, max }: { score: number | null; max: number | null }) {
  if (score === null || max === null) return <span style={{ color: "#CBD5E1" }}>—</span>
  const pct = max > 0 ? score / max : 0
  const color = pct >= 0.86 ? "#065F46" : pct >= 0.71 ? "#1E3A8A" : pct >= 0.56 ? "#92400E" : "#991B1B"
  return (
    <span className="tabular-nums font-semibold text-xs" style={{ color }}>
      {score}<span className="text-[9px] font-normal" style={{ color: "#94A3B8" }}>/{max}</span>
    </span>
  )
}

function EvaluatorTable({
  e,
  sessionEvaluatorId,
  lembagaSlug,
  onEdit,
}: {
  e: EvaluateeRowData
  sessionEvaluatorId: string
  lembagaSlug: string
  onEdit: (t: LembagaEditTarget) => void
}) {
  const hasMyEval = e.evaluationSummaries.some((s) => s.evaluatorId === sessionEvaluatorId)
  const secCount = e.rubricType === "ae" ? 5 : 7

  return (
    <div>
      {e.evaluationSummaries.length === 0 ? (
        <div className="py-6 flex flex-col items-center gap-2">
          <p className="text-xs text-slate-400">Belum ada penilaian untuk karyawan ini.</p>
          <button
            onClick={() =>
              onEdit({
                employeeId: e.id,
                employeeName: e.name,
                evaluatorId: sessionEvaluatorId,
                evaluatorName: "Saya",
                rubricType: e.rubricType,
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "linear-gradient(135deg, #C4972A, #E8B84B)", color: "#1C1409" }}
          >
            <Plus size={12} /> Tambah Penilaian
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: secCount === 5 ? "560px" : "700px" }}>
            <thead>
              <tr style={{ backgroundColor: "#EDF2F7" }}>
                <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>Penilai</th>
                {SECTION_NAMES.slice(0, secCount).map((name, i) => (
                  <th key={i} className="px-1.5 py-2 text-center" style={{ color: "#64748B", minWidth: "60px" }}>
                    <div className="text-[8px] font-bold uppercase" style={{ color: "#C4972A" }}>{String.fromCharCode(65 + i)}</div>
                    <div className="text-[8px] font-semibold uppercase leading-tight">{name}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>Total</th>
                <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>Predikat</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {e.evaluationSummaries.map((sum) => {
                const pct = sum.totalScore / sum.maxScore
                const gradeInfo = pct >= 0.86
                  ? { label: "Sangat Baik", color: "#065F46", bg: "#BBF7D0" }
                  : pct >= 0.71
                  ? { label: "Baik", color: "#1E3A8A", bg: "#BFDBFE" }
                  : pct >= 0.56
                  ? { label: "Cukup", color: "#92400E", bg: "#FDE68A" }
                  : { label: "Perlu Perbaikan", color: "#991B1B", bg: "#FECACA" }
                return (
                  <tr key={sum.evaluatorId} style={{ borderTop: "1px solid #E2E8F0" }}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                          style={{ backgroundColor: "#0F2540", fontSize: "8px" }}
                        >
                          {sum.evaluatorName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{sum.evaluatorName}</span>
                        {sum.catatan && (
                          <span
                            className="text-[8px] px-1.5 py-0.5 rounded font-medium shrink-0"
                            title={sum.catatan}
                            style={{ backgroundColor: "#C7D2FE", color: "#3730A3" }}
                          >
                            catatan
                          </span>
                        )}
                      </div>
                    </td>
                    {sum.sectionScores.slice(0, secCount).map((score, i) => (
                      <td key={i} className="px-1.5 py-2.5 text-center">
                        <ScoreCell score={score} max={sum.sectionMax[i]} />
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-center">
                      <span className="tabular-nums font-bold text-xs" style={{ color: "#0F2540" }}>
                        {sum.totalScore}<span className="text-[9px] font-normal" style={{ color: "#94A3B8" }}>/{sum.maxScore}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: gradeInfo.bg, color: gradeInfo.color }}
                      >
                        {gradeInfo.label}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right pr-3">
                      <button
                        onClick={() =>
                          onEdit({
                            employeeId: e.id,
                            employeeName: e.name,
                            evaluatorId: sum.evaluatorId,
                            evaluatorName: sum.evaluatorName,
                            rubricType: e.rubricType,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-opacity hover:opacity-80"
                        style={{ background: "linear-gradient(135deg, #1E3A5F, #2A4F7A)", color: "#fff" }}
                      >
                        <PenLine size={9} /> Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Add current-session evaluator's score if not yet submitted */}
          {!hasMyEval && (
            <div className="px-4 py-3 border-t" style={{ borderColor: "#E2E8F0" }}>
              <button
                onClick={() =>
                  onEdit({
                    employeeId: e.id,
                    employeeName: e.name,
                    evaluatorId: sessionEvaluatorId,
                    evaluatorName: "Saya",
                    rubricType: e.rubricType,
                  })
                }
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "linear-gradient(135deg, #C4972A, #E8B84B)", color: "#1C1409" }}
              >
                <Plus size={11} /> Tambah Penilaian Saya
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExpandedRow({
  e,
  colSpan,
  sessionEvaluatorId,
  lembagaSlug,
  onEdit,
}: {
  e: EvaluateeRowData
  colSpan: number
  sessionEvaluatorId: string
  lembagaSlug: string
  onEdit: (t: LembagaEditTarget) => void
}) {
  return (
    <tr style={{ backgroundColor: "#F8FAFC" }}>
      <td colSpan={colSpan} className="px-0 py-0" style={{ borderBottom: "2px solid #DDE3EC" }}>
        <div className="px-5 pt-3 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#94A3B8" }}>
            Rekap Penilaian Per Penilai
          </p>
        </div>
        <EvaluatorTable
          e={e}
          sessionEvaluatorId={sessionEvaluatorId}
          lembagaSlug={lembagaSlug}
          onEdit={onEdit}
        />
        {/* Catatan from first evaluator if any */}
        {e.evaluationSummaries.length > 0 && e.evaluationSummaries.some((s) => s.catatan) && (
          <div className="px-5 py-3 border-t space-y-2" style={{ borderColor: "#E2E8F0" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>Catatan</p>
            {e.evaluationSummaries.filter((s) => s.catatan).map((s) => (
              <div key={s.evaluatorId} className="flex gap-2">
                <span className="text-[10px] font-semibold shrink-0" style={{ color: "#64748B" }}>{s.evaluatorName}:</span>
                <span className="text-xs" style={{ color: "#475569" }}>{s.catatan}</span>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

function EvalRow({
  e,
  index,
  lembagaSlug,
  colSpan,
  sectionCount,
  sessionEvaluatorId,
  onEdit,
}: {
  e: EvaluateeRowData
  index: number
  lembagaSlug: string
  colSpan: number
  sectionCount: number
  sessionEvaluatorId: string
  onEdit: (t: LembagaEditTarget) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const roleStyle = ROLE_COLORS[e.role] ?? { bg: "#F3F4F6", color: "#6B7280" }
  const hasAny = e.evaluationSummaries.length > 0

  return (
    <>
      <tr
        className="tr-hover cursor-pointer"
        style={{ borderBottom: expanded ? "none" : "1px solid #EDF0F5" }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* # */}
        <td className="py-3 pl-4 text-center w-8">
          <span className="text-xs font-medium tabular-nums" style={{ color: "#9CA3AF" }}>{index + 1}</span>
        </td>

        {/* Name */}
        <td className="px-3 py-2.5" style={{ minWidth: "160px" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{
                backgroundColor: e.evaluated ? "#BBF7D0" : "#F3F4F6",
                color: e.evaluated ? "#14532D" : "#9CA3AF",
              }}
            >
              {e.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-semibold text-sm text-gray-800 truncate leading-tight">{e.name}</p>
                <ChevronRight
                  size={12}
                  style={{
                    color: hasAny ? "#C4972A" : "#94A3B8",
                    transform: expanded ? "rotate(90deg)" : "none",
                    transition: "transform 0.15s",
                    flexShrink: 0,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={roleStyle}>
                  {ROLE_LABEL[e.role] ?? e.role}
                </span>
                {e.divisi && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#FDE68A", color: "#78350F" }}>
                    {e.divisi}
                  </span>
                )}
                {hasAny && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#BFDBFE", color: "#1E3A8A" }}>
                    {e.evaluationSummaries.length} penilai
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>

        {/* Section score columns — A–E or A–G based on sectionCount */}
        {e.sectionScores.slice(0, sectionCount).map((score, i) => (
          <td key={i} className="px-2 py-3 text-center" style={{ minWidth: "44px" }}>
            <ScoreCell score={score} max={e.sectionMax[i]} />
          </td>
        ))}

        {/* Total */}
        <td className="px-3 py-3 text-center" style={{ minWidth: "60px" }}>
          {e.totalScore !== null ? (
            <span className="tabular-nums font-bold text-xs" style={{ color: "#0F2540" }}>
              {e.totalScore}<span className="text-[9px] font-normal" style={{ color: "#94A3B8" }}>/{e.maxScore}</span>
            </span>
          ) : (
            <span style={{ color: "#CBD5E1", fontSize: "10px" }}>—</span>
          )}
        </td>

        {/* Grade */}
        <td className="px-2 py-3 text-center" style={{ minWidth: "80px" }}>
          {e.grade ? (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: e.grade.bg, color: e.grade.color }}
            >
              {e.grade.label}
            </span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FDE68A", color: "#78350F" }}>
              Belum
            </span>
          )}
        </td>

        {/* Action */}
        <td className="px-3 py-3 text-right pr-4" style={{ minWidth: "72px" }}>
          <Link
            href={`/${lembagaSlug}/form/${e.id}`}
            onClick={(ev) => ev.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
            style={{
              background: e.evaluated
                ? "linear-gradient(135deg, #1E3A5F, #2A4F7A)"
                : "linear-gradient(135deg, #C4972A, #E8B84B)",
              color: e.evaluated ? "#FFF" : "#1C1409",
              boxShadow: "0 2px 8px rgba(15,37,64,0.15)",
            }}
          >
            <PenLine size={11} />
            {e.evaluated ? "Edit" : "Nilai"}
          </Link>
        </td>
      </tr>

      {expanded && (
        <ExpandedRow
          e={e}
          colSpan={colSpan}
          sessionEvaluatorId={sessionEvaluatorId}
          lembagaSlug={lembagaSlug}
          onEdit={onEdit}
        />
      )}
    </>
  )
}

export function LembagaDashboard({ lembagaSlug, lembagaLabel, session, evaluatees }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortBy, setSortBy]             = useState<SortBy>("name-asc")
  const [searchQ, setSearchQ]           = useState("")
  const [divisiFilter, setDivisiFilter] = useState("all")
  const [roleFilter, setRoleFilter]     = useState("all")
  const [editTarget, setEditTarget]     = useState<LembagaEditTarget | null>(null)

  const handleEdit = useCallback((t: LembagaEditTarget) => setEditTarget(t), [])

  async function logout() {
    await fetch("/api/auth/lembaga", { method: "DELETE" })
    router.push(`/${lembagaSlug}`)
    router.refresh()
  }

  const done    = evaluatees.filter((e) => e.evaluated).length
  const pending = evaluatees.length - done

  let divisiTags: string[] = []
  if (session.divisi) {
    try {
      const p = JSON.parse(session.divisi)
      if (Array.isArray(p)) divisiTags = p
    } catch {
      divisiTags = [session.divisi]
    }
  }

  const divisiOptions = useMemo(() => {
    const set = new Set<string>()
    for (const e of evaluatees) if (e.divisi) set.add(e.divisi)
    return [{ value: "all", label: "Semua Divisi" }, ...[...set].sort().map((d) => ({ value: d, label: d }))]
  }, [evaluatees])

  const roleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const e of evaluatees) set.add(e.role)
    return [
      { value: "all", label: "Semua Jabatan" },
      ...[...set].sort().map((r) => ({ value: r, label: ROLE_LABEL[r] ?? r })),
    ]
  }, [evaluatees])

  const filtered = useMemo(() => {
    let list = [...evaluatees]
    if (statusFilter === "done")    list = list.filter((e) => e.evaluated)
    if (statusFilter === "pending") list = list.filter((e) => !e.evaluated)
    if (divisiFilter !== "all")     list = list.filter((e) => e.divisi === divisiFilter)
    if (roleFilter !== "all")       list = list.filter((e) => e.role === roleFilter)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (ROLE_LABEL[e.role] ?? e.role).toLowerCase().includes(q) ||
          (e.divisi ?? "").toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      if (sortBy === "name-desc")      return b.name.localeCompare(a.name)
      if (sortBy === "score-high")     return (b.totalScore ?? -1) - (a.totalScore ?? -1)
      if (sortBy === "score-low")      return (a.totalScore ?? -1) - (b.totalScore ?? -1)
      if (sortBy === "status-done")    return (b.evaluated ? 1 : 0) - (a.evaluated ? 1 : 0)
      if (sortBy === "status-pending") return (a.evaluated ? 1 : 0) - (b.evaluated ? 1 : 0)
      return a.name.localeCompare(b.name)
    })
    return list
  }, [evaluatees, statusFilter, sortBy, searchQ, divisiFilter, roleFilter])

  const isFiltered = statusFilter !== "all" || divisiFilter !== "all" || roleFilter !== "all" || !!searchQ

  // Dynamic section count: 5 (A–E) when all visible rows are staff, else 7 (A–G)
  const sectionCount = useMemo(
    () => (filtered.every((e) => e.rubricType === "ae") ? 5 : 7),
    [filtered]
  )
  // # + Name + sections + Total + Grade + Action
  const totalCols = 2 + sectionCount + 3

  return (
    <div className="space-y-6 animate-in">
      {/* ── Header ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <div className="px-6 py-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(196,151,42,0.85)" }}>
                {lembagaLabel} · Dashboard Penilaian
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #C4972A, #E8B84B)" }}
                >
                  <User2 size={18} color="#0F2540" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-white truncate leading-tight">{session.name}</h1>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}
                    >
                      {ROLE_LABEL[session.role] ?? session.role}
                    </span>
                    {divisiTags.map((d) => (
                      <span
                        key={d}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(196,151,42,0.18)", color: "#E8B84B" }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {[
                { label: "Total Karyawan", value: evaluatees.length, color: "#C4972A" },
                { label: "Selesai",        value: done,              color: "#16A34A" },
                { label: "Belum Dinilai",  value: pending,           color: "#F59E0B" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg px-4 py-2.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <div className="text-xl font-bold tabular-nums leading-none" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.50)" }}>{s.label}</div>
                </div>
              ))}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#FCA5A5", border: "1px solid rgba(220,38,38,0.3)" }}
              >
                <LogOut size={14} /> Keluar
              </button>
            </div>
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />
      </div>

      {evaluatees.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-gray-500">Tidak ada karyawan yang dapat Anda nilai saat ini.</p>
        </div>
      ) : (
        <div className="card">
          {/* Filter bar */}
          <div
            className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2.5"
            style={{ borderBottom: "1px solid #DDE3EC" }}
          >
            <h2 className="font-semibold text-slate-800 shrink-0 text-sm">
              Karyawan
              <span className="ml-2 text-xs font-normal text-gray-400">({evaluatees.length} orang)</span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Cari…"
                  className="pl-7 pr-6 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                  style={{ outline: "none", width: "120px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#C4972A")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
                {searchQ && (
                  <button onClick={() => setSearchQ("")} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
                    <X size={10} />
                  </button>
                )}
              </div>

              {divisiOptions.length > 2 && (
                <FilterDropdown label="Divisi" options={divisiOptions} value={divisiFilter} defaultValue="all" onChange={setDivisiFilter} />
              )}
              {roleOptions.length > 2 && (
                <FilterDropdown label="Jabatan" options={roleOptions} value={roleFilter} defaultValue="all" onChange={setRoleFilter} />
              )}
              <FilterDropdown
                label="Status"
                options={[
                  { value: "all",     label: "Semua"   },
                  { value: "done",    label: "Selesai" },
                  { value: "pending", label: "Belum"   },
                ] as { value: StatusFilter; label: string }[]}
                value={statusFilter}
                defaultValue="all"
                onChange={setStatusFilter}
              />
              <FilterDropdown
                label="Urutan"
                options={[
                  { value: "name-asc",       label: "Nama A–Z"       },
                  { value: "name-desc",      label: "Nama Z–A"       },
                  { value: "score-high",     label: "Skor Tertinggi" },
                  { value: "score-low",      label: "Skor Terendah"  },
                  { value: "status-done",    label: "Selesai Dulu"   },
                  { value: "status-pending", label: "Belum Dulu"     },
                ] as { value: SortBy; label: string }[]}
                value={sortBy}
                defaultValue="name-asc"
                onChange={setSortBy}
              />
              {isFiltered && (
                <button
                  onClick={() => { setStatusFilter("all"); setSortBy("name-asc"); setSearchQ(""); setDivisiFilter("all"); setRoleFilter("all") }}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EDF0F5" }}>
                <Search size={18} style={{ color: "#94A3B8" }} />
              </div>
              <p className="text-sm text-slate-400">Tidak ada data yang sesuai filter</p>
              <button
                onClick={() => { setStatusFilter("all"); setSortBy("name-asc"); setSearchQ(""); setDivisiFilter("all"); setRoleFilter("all") }}
                className="px-4 py-1.5 text-xs font-medium rounded-lg"
                style={{ backgroundColor: "#EDF0F5", color: "#374151" }}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1060px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F1F4F8", borderBottom: "2px solid #DDE3EC" }}>
                    <th className="py-2.5 pl-4 text-center text-[10px] font-bold uppercase tracking-widest w-8" style={{ color: "#6B7280" }}>#</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6B7280" }}>Nama</th>
                    {SECTION_NAMES.slice(0, sectionCount).map((name, i) => (
                      <th key={i} className="px-2 py-2 text-center" style={{ color: "#6B7280", minWidth: "72px" }}>
                        <div className="text-[8px] font-bold uppercase" style={{ color: "#C4972A" }}>{String.fromCharCode(65 + i)}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wide leading-tight">{name}</div>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest w-14" style={{ color: "#6B7280" }}>Total</th>
                    <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest w-20" style={{ color: "#6B7280" }}>Predikat</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <EvalRow
                      key={e.id}
                      e={e}
                      index={i}
                      lembagaSlug={lembagaSlug}
                      colSpan={totalCols}
                      sectionCount={sectionCount}
                      sessionEvaluatorId={session.evaluatorId}
                      onEdit={handleEdit}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {editTarget && (
        <LembagaEvalModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
