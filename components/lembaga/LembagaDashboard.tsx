"use client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, PenLine, LogOut, User2, Users } from "lucide-react"
import { useMemo } from "react"

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
  staff: "Staff",
  koordinator: "Koordinator",
  supervisor: "Supervisor",
  ceo: "CEO",
  pm: "Project Manager",
  management: "Management",
  evaluator: "Penilai",
  founder: "General Manager",
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  koordinator: { bg: "#EDE9FE", color: "#5B21B6" },
  supervisor:  { bg: "#DBEAFE", color: "#1D4ED8" },
  ceo:         { bg: "#FEE2E2", color: "#B91C1C" },
  pm:          { bg: "#D1FAE5", color: "#065F46" },
  staff:       { bg: "#EEF2FF", color: "#4338CA" },
}

function EvaluateeItem({
  e,
  lembagaSlug,
}: {
  e: EvaluateeRow
  lembagaSlug: string
}) {
  const roleStyle = ROLE_COLORS[e.role] ?? { bg: "#F3F4F6", color: "#6B7280" }
  return (
    <li className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
        style={{
          backgroundColor: e.evaluated ? "#DCFCE7" : "#F3F4F6",
          color: e.evaluated ? "#15803D" : "#6B7280",
        }}
      >
        {e.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-gray-800 truncate">{e.name}</p>
          {e.evaluated && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: "#15803D", backgroundColor: "#DCFCE7" }}>
              <CheckCircle2 size={10} /> Sudah Dinilai
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase" style={roleStyle}>
            {ROLE_LABEL[e.role] ?? e.role}
          </span>
          {e.divisi && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
              {e.divisi}
            </span>
          )}
        </div>
      </div>
      <Link
        href={`/${lembagaSlug}/form/${e.id}`}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white shrink-0 transition-opacity hover:opacity-90"
        style={{
          background: e.evaluated
            ? "linear-gradient(135deg, #1E3A5F, #2A4F7A)"
            : "linear-gradient(135deg, #C4972A, #E8B84B)",
          color: e.evaluated ? "#FFF" : "#1C1409",
          boxShadow: "0 2px 8px rgba(15,37,64,0.15)",
        }}
      >
        <PenLine size={12} />
        {e.evaluated ? "Edit" : "Nilai"}
      </Link>
    </li>
  )
}

export function LembagaDashboard({ lembagaSlug, lembagaLabel, session, evaluatees, grouped = false }: Props) {
  const router = useRouter()

  async function logout() {
    await fetch("/api/auth/lembaga", { method: "DELETE" })
    router.push(`/${lembagaSlug}`)
    router.refresh()
  }

  const done = evaluatees.filter((e) => e.evaluated).length
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

  // Build grouped structure: divisi → [koordinator, ...staff]
  const divisiGroups = useMemo(() => {
    if (!grouped) return null
    const map = new Map<string, EvaluateeRow[]>()
    for (const e of evaluatees) {
      const key = e.divisi ?? "—"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    // Sort within each group: koordinator/supervisor first, then by name
    map.forEach((list) => {
      list.sort((a, b) => {
        const priority = (r: string) =>
          r === "supervisor" ? 0 : r === "koordinator" ? 1 : 2
        const diff = priority(a.role) - priority(b.role)
        return diff !== 0 ? diff : a.name.localeCompare(b.name)
      })
    })
    // Sort groups: named divisi alphabetically, "—" last
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "—") return 1
      if (b === "—") return -1
      return a.localeCompare(b)
    })
  }, [evaluatees, grouped])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <div className="px-6 py-6 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
              {lembagaLabel} · Dashboard Penilai
            </p>
            <div className="flex items-center gap-2.5 mt-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #C4972A, #E8B84B)" }}
              >
                <User2 size={16} color="#0F2540" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-white truncate">{session.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}>
                    {ROLE_LABEL[session.role] ?? session.role}
                  </span>
                  {divisiTags.map((d) => (
                    <span key={d} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(196,151,42,0.18)", color: "#E8B84B" }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg px-4 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-lg font-bold tabular-nums leading-none" style={{ color: "#16A34A" }}>{done}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Selesai</div>
            </div>
            <div className="rounded-lg px-4 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-lg font-bold tabular-nums leading-none" style={{ color: "#F59E0B" }}>{pending}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Belum</div>
            </div>
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
        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />
      </div>

      {evaluatees.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-gray-500">Tidak ada karyawan yang dapat Anda nilai saat ini.</p>
        </div>
      ) : divisiGroups ? (
        /* ── Grouped by divisi (supervisor / founder on IYSA) ── */
        <div className="space-y-4">
          {divisiGroups.map(([divisi, members]) => {
            const divisiDone = members.filter((m) => m.evaluated).length
            return (
              <div key={divisi} className="card overflow-hidden">
                <div
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid #DDE3EC", backgroundColor: "#F8FAFC" }}
                >
                  <div className="flex items-center gap-2">
                    <Users size={14} style={{ color: "#64748B" }} />
                    <span className="font-bold text-sm text-gray-700">{divisi}</span>
                    <span className="text-xs text-gray-400">{members.length} orang</span>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: divisiDone === members.length ? "#DCFCE7" : "#FEF3C7",
                      color: divisiDone === members.length ? "#15803D" : "#92400E",
                    }}
                  >
                    {divisiDone}/{members.length} selesai
                  </span>
                </div>
                <ul className="divide-y" style={{ borderColor: "#EDF0F5" }}>
                  {members.map((e) => (
                    <EvaluateeItem key={e.id} e={e} lembagaSlug={lembagaSlug} />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Flat list (koordinator, ceo, pm) ── */
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "#DDE3EC" }}>
            <h2 className="font-bold text-gray-800">Karyawan untuk Dinilai</h2>
            <span className="text-xs text-gray-500">{evaluatees.length} orang</span>
          </div>
          <ul className="divide-y" style={{ borderColor: "#EDF0F5" }}>
            {evaluatees.map((e) => (
              <EvaluateeItem key={e.id} e={e} lembagaSlug={lembagaSlug} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
