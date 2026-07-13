"use client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, PenLine, LogOut, User2, Users, AlertCircle,
  Clock, Search, ChevronDown, X,
} from "lucide-react"
import { useMemo, useState, useRef, useEffect } from "react"

interface EvaluateeRow {
  id: string
  name: string
  role: string
  divisi: string | null
  evaluated: boolean
}

interface Props {
  lembagaSlug: "iysa" | "icgi" | "iyora"
  lembagaLabel: string
  session: { name: string; role: string; divisi: string | null }
  evaluatees: EvaluateeRow[]
  grouped?: boolean
}

const ROLE_LABEL: Record<string, string> = {
  staff:       "Staff",
  koordinator: "Koordinator",
  supervisor:  "Supervisor",
  ceo:         "CEO",
  pm:          "Project Manager",
  management:  "Management",
  founder:     "General Manager",
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  koordinator: { bg: "#EDE9FE", color: "#5B21B6" },
  supervisor:  { bg: "#DBEAFE", color: "#1D4ED8" },
  ceo:         { bg: "#FEE2E2", color: "#B91C1C" },
  pm:          { bg: "#D1FAE5", color: "#065F46" },
  staff:       { bg: "#EEF2FF", color: "#4338CA" },
  founder:     { bg: "#FEF3C7", color: "#92400E" },
}

type StatusFilter = "all" | "done" | "pending"
type SortBy       = "name-asc" | "name-desc" | "status-done" | "status-pending"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all",     label: "Semua"    },
  { value: "done",    label: "Selesai"  },
  { value: "pending", label: "Belum"    },
]

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "name-asc",       label: "Nama A–Z"       },
  { value: "name-desc",      label: "Nama Z–A"       },
  { value: "status-done",    label: "Selesai Dulu"   },
  { value: "status-pending", label: "Belum Dulu"     },
]

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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
        style={{
          backgroundColor: isActive ? "#0F2540" : "#EDF0F5",
          color: isActive ? "#FFFFFF" : "#64748B",
          border: isActive ? "1px solid transparent" : "1px solid #DDE3EC",
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{label}</span>
        <span>{current?.label}</span>
        <ChevronDown
          size={11}
          style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        />
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

function EvaluateeRow_({
  e,
  index,
  lembagaSlug,
}: {
  e: EvaluateeRow
  index: number
  lembagaSlug: string
}) {
  const roleStyle = ROLE_COLORS[e.role] ?? { bg: "#F3F4F6", color: "#6B7280" }
  return (
    <tr className="tr-hover" style={{ borderBottom: "1px solid #EDF0F5" }}>
      {/* Rank */}
      <td className="py-3 pl-4 text-center">
        <span className="text-xs font-medium tabular-nums" style={{ color: "#9CA3AF" }}>{index + 1}</span>
      </td>

      {/* Avatar + Name */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
            style={{
              backgroundColor: e.evaluated ? "#DCFCE7" : "#F3F4F6",
              color: e.evaluated ? "#15803D" : "#9CA3AF",
            }}
          >
            {e.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-800 truncate leading-tight">{e.name}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={roleStyle}
              >
                {ROLE_LABEL[e.role] ?? e.role}
              </span>
              {e.divisi && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  {e.divisi}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3 text-center">
        {e.evaluated ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: "#15803D", backgroundColor: "#DCFCE7" }}
          >
            <CheckCircle2 size={10} /> Selesai
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: "#D97706", backgroundColor: "#FEF3C7" }}
          >
            <Clock size={10} /> Belum
          </span>
        )}
      </td>

      {/* Action */}
      <td className="px-3 py-3 text-right pr-4">
        <Link
          href={`/${lembagaSlug}/form/${e.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-opacity hover:opacity-90"
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
  )
}


export function LembagaDashboard({ lembagaSlug, lembagaLabel, session, evaluatees, grouped = false }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortBy, setSortBy]             = useState<SortBy>("name-asc")
  const [searchQ, setSearchQ]           = useState("")

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

  // Apply filters + sort for flat view
  const filteredFlat = useMemo(() => {
    let list = [...evaluatees]
    if (statusFilter === "done")    list = list.filter((e) => e.evaluated)
    if (statusFilter === "pending") list = list.filter((e) => !e.evaluated)
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
      if (sortBy === "name-desc")       return b.name.localeCompare(a.name)
      if (sortBy === "status-done")     return (b.evaluated ? 1 : 0) - (a.evaluated ? 1 : 0)
      if (sortBy === "status-pending")  return (a.evaluated ? 1 : 0) - (b.evaluated ? 1 : 0)
      return a.name.localeCompare(b.name)
    })
    return list
  }, [evaluatees, statusFilter, sortBy, searchQ])

  // Grouped structure (supervisor / founder)
  const divisiGroups = useMemo(() => {
    if (!grouped) return null
    const map = new Map<string, EvaluateeRow[]>()
    for (const e of evaluatees) {
      const key = e.divisi ?? "—"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    map.forEach((list) => {
      list.sort((a, b) => {
        const priority = (r: string) =>
          r === "supervisor" ? 0 : r === "koordinator" ? 1 : 2
        const diff = priority(a.role) - priority(b.role)
        return diff !== 0 ? diff : a.name.localeCompare(b.name)
      })
    })
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "—") return 1
      if (b === "—") return -1
      return a.localeCompare(b)
    })
  }, [evaluatees, grouped])

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0)

  const stats = [
    { label: "Total",   value: evaluatees.length, color: "#C4972A",  icon: Users         },
    { label: "Selesai", value: done,               color: "#16A34A",  icon: CheckCircle2  },
    { label: "Belum",   value: pending,            color: "#D97706",  icon: Clock         },
    { label: "Sisa",    value: pending,            color: "#DC2626",  icon: AlertCircle   },
  ]

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
            {/* Left: identity */}
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

            {/* Right: stats + logout */}
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
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
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
      ) : divisiGroups ? (
        /* ── Grouped by divisi (supervisor / founder) ── */
        <>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Cari nama, role, atau divisi…"
              className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border-2 border-gray-200 bg-white"
              style={{ outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = "#C4972A")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
            {searchQ && (
              <button
                onClick={() => setSearchQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "#9CA3AF" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {divisiGroups.map(([divisi, members]) => {
              const visibleMembers = searchQ.trim()
                ? members.filter(
                    (e) =>
                      e.name.toLowerCase().includes(searchQ.toLowerCase()) ||
                      (ROLE_LABEL[e.role] ?? e.role).toLowerCase().includes(searchQ.toLowerCase()) ||
                      divisi.toLowerCase().includes(searchQ.toLowerCase())
                  )
                : members
              if (visibleMembers.length === 0) return null

              const divisiDone = visibleMembers.filter((m) => m.evaluated).length
              return (
                <div key={divisi} className="card overflow-hidden">
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: "1px solid #DDE3EC", backgroundColor: "#F8FAFC" }}
                  >
                    <div className="flex items-center gap-2">
                      <Users size={14} style={{ color: "#64748B" }} />
                      <span className="font-bold text-sm text-gray-700">{divisi}</span>
                      <span className="text-xs text-gray-400">{visibleMembers.length} orang</span>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: divisiDone === visibleMembers.length ? "#DCFCE7" : "#FEF3C7",
                        color: divisiDone === visibleMembers.length ? "#15803D" : "#92400E",
                      }}
                    >
                      {divisiDone}/{visibleMembers.length} selesai
                    </span>
                  </div>
                  <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "420px" }}>
                      <tbody>
                        {visibleMembers.map((e, i) => (
                          <EvaluateeRow_ key={e.id} e={e} index={i} lembagaSlug={lembagaSlug} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* ── Flat list (koordinator, ceo, pm) ── */
        <div className="card">
          {/* Header with search + filters */}
          <div
            className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2.5"
            style={{ borderBottom: "1px solid #DDE3EC" }}
          >
            <h2 className="font-semibold text-slate-800 shrink-0 text-sm">
              Karyawan untuk Dinilai
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
                  style={{ outline: "none", width: "130px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#C4972A")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
                {searchQ && (
                  <button
                    onClick={() => setSearchQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: "#9CA3AF" }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              <FilterDropdown
                label="Status"
                options={STATUS_OPTIONS}
                value={statusFilter}
                defaultValue="all"
                onChange={setStatusFilter}
              />
              <FilterDropdown
                label="Urutan"
                options={SORT_OPTIONS}
                value={sortBy}
                defaultValue="name-asc"
                onChange={setSortBy}
              />
              {(activeFilterCount > 0 || searchQ) && (
                <button
                  onClick={() => { setStatusFilter("all"); setSortBy("name-asc"); setSearchQ("") }}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {filteredFlat.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#EDF0F5" }}
              >
                <Search size={18} style={{ color: "#94A3B8" }} />
              </div>
              <p className="text-sm text-slate-400">
                {searchQ || statusFilter !== "all"
                  ? "Tidak ada data yang sesuai filter"
                  : "Tidak ada karyawan"}
              </p>
              {(searchQ || statusFilter !== "all") && (
                <button
                  onClick={() => { setStatusFilter("all"); setSortBy("name-asc"); setSearchQ("") }}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg"
                  style={{ backgroundColor: "#EDF0F5", color: "#374151" }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "480px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F1F4F8", borderBottom: "2px solid #DDE3EC" }}>
                    <th className="py-2.5 pl-4 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6B7280", width: "2.5rem" }}>#</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6B7280" }}>Nama</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6B7280", width: "8rem" }}>Status</th>
                    <th style={{ width: "7rem" }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredFlat.map((e, i) => (
                    <EvaluateeRow_ key={e.id} e={e} index={i} lembagaSlug={lembagaSlug} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
