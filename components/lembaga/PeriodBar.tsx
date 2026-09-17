"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CalendarDays, ChevronDown, Lock, Check, Settings2, AlertCircle, Zap } from "lucide-react"
import { PERIOD_STATUS, isPeriodStatus, shortLabel } from "@/lib/period-format"

export type PeriodBarInfo = {
  id: string
  lembaga: string
  year: number
  month: number
  label: string
  status: string
  opensAt: string | Date
  closesAt: string | Date
  publishedAt: string | Date | null
  dapatDinilai: boolean
  sisaHari: number | null
}

const PENGELOLA = ["supervisor", "ceo", "pm", "founder", "management", "superadmin"]

function statusMeta(status: string) {
  return isPeriodStatus(status) ? PERIOD_STATUS[status] : PERIOD_STATUS.draf
}

function tanggal(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", timeZone: "Asia/Jakarta",
  })
}

/**
 * Bar konteks periode. Menjawab tiga pertanyaan yang selalu muncul saat
 * seorang penilai membuka dashboard: bulan apa yang sedang saya isi, berapa
 * sisa waktunya, dan berapa yang sudah saya selesaikan.
 */
export function PeriodBar({
  lembagaSlug,
  period,
  periods,
  role,
  terkirim,
  draf,
  total,
}: {
  lembagaSlug: string
  period: PeriodBarInfo
  periods: PeriodBarInfo[]
  role: string
  terkirim: number
  draf: number
  total: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const meta = statusMeta(period.status)
  const bolehKelola = PENGELOLA.includes(role)
  const persen = total > 0 ? Math.round((terkirim / total) * 100) : 0
  const mendesak = period.dapatDinilai && period.sisaHari !== null && period.sisaHari <= 2

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-3"
      style={{
        backgroundColor: "#FFFFFF",
        border: `1px solid ${mendesak ? "#FCA5A5" : "#DDE3EC"}`,
        boxShadow: "0 1px 2px rgba(15,37,64,0.04)",
      }}
    >
      {/* ── Pemilih periode ── */}
      <div ref={ref} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
          style={{ backgroundColor: "#F1F5F9", color: "#0F2540", border: "1px solid #E2E8F0" }}
        >
          <CalendarDays size={14} style={{ color: "#64748B" }} />
          {period.label}
          <ChevronDown
            size={12}
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", color: "#94A3B8" }}
          />
        </button>

        {open && (
          <div
            className="absolute left-0 top-full mt-1.5 z-[300] min-w-[220px] max-h-[320px] overflow-y-auto rounded-xl bg-white"
            style={{ border: "1px solid #DDE3EC", boxShadow: "0 12px 32px rgba(15,37,64,0.18)" }}
          >
            {periods.length === 0 && (
              <div className="px-3.5 py-3 text-xs" style={{ color: "#94A3B8" }}>
                Belum ada periode
              </div>
            )}
            {periods.map((p) => {
              const m = statusMeta(p.status)
              const aktif = p.id === period.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    router.push(`/${lembagaSlug}/dashboard?periode=${encodeURIComponent(p.id)}`)
                    router.refresh()
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                  style={{ backgroundColor: aktif ? "#F8FAFC" : "transparent" }}
                >
                  <span className="font-semibold shrink-0" style={{ color: aktif ? "#0F2540" : "#475569" }}>
                    {shortLabel(p.year, p.month)}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
                    style={{ backgroundColor: m.bg, color: m.color }}
                  >
                    {m.label}
                  </span>
                  {aktif && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#C4972A" }} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Status periode ── */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          {!period.dapatDinilai && <Lock size={9} />}
          {meta.label}
        </span>
        {period.dapatDinilai ? (
          <span className="text-xs" style={{ color: mendesak ? "#B91C1C" : "#64748B" }}>
            {period.sisaHari === null
              ? `${tanggal(period.opensAt)} – ${tanggal(period.closesAt)}`
              : period.sisaHari > 0
                ? `Tutup ${tanggal(period.closesAt)} · sisa ${period.sisaHari} hari`
                : `Lewat tenggat ${tanggal(period.closesAt)}`}
          </span>
        ) : period.status === "draf" ? (
          <span className="text-xs" style={{ color: "#64748B" }}>
            Dibuka {tanggal(period.opensAt)}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "#64748B" }}>{meta.desc}</span>
        )}
      </div>

      {/* ── Progres pengisian ── */}
      <div className="flex items-center gap-2.5 ml-auto min-w-[190px]">
        <div className="flex-1 min-w-[80px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
              Penilaian Anda
            </span>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: "#0F2540" }}>
              {terkirim}/{total}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${persen}%`,
                background: persen === 100
                  ? "linear-gradient(90deg,#16A34A,#4ADE80)"
                  : "linear-gradient(90deg,#C4972A,#E8B84B)",
                transition: "width .5s cubic-bezier(.22,1,.36,1)",
              }}
            />
          </div>
        </div>

        {persen === 100 ? (
          <span className="flex items-center gap-1 text-[11px] font-bold shrink-0" style={{ color: "#16A34A" }}>
            <Check size={12} /> Selesai
          </span>
        ) : draf > 0 ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold shrink-0" style={{ color: "#B45309" }}>
            <AlertCircle size={12} /> {draf} draf
          </span>
        ) : null}
      </div>

      {/* Mode cepat baru berguna kalau masih ada yang harus dinilai — dan
          makin terasa manfaatnya makin banyak orang yang dipegang. */}
      {period.dapatDinilai && terkirim < total && (
        <Link
          href={`/${lembagaSlug}/nilai-cepat?periode=${encodeURIComponent(period.id)}`}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold shrink-0"
          style={{
            background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
            color: "#1C1409",
            boxShadow: "0 2px 8px rgba(196,151,42,0.32)",
          }}
          title="Nilai satu kriteria untuk seluruh tim sekaligus"
        >
          <Zap size={13} /> Mode Cepat
        </Link>
      )}

      {bolehKelola && (
        <Link
          href={`/${lembagaSlug}/periode`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-colors hover:bg-slate-100"
          style={{ color: "#475569", border: "1px solid #E2E8F0" }}
        >
          <Settings2 size={13} /> Kelola Periode
        </Link>
      )}
    </div>
  )
}
