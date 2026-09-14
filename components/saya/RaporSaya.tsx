"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"
import {
  Check, LogOut, FileText, MessageSquareText, TrendingUp, TrendingDown, Minus, Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"

export type RaporBulan = {
  periodId: string
  label: string
  pendek: string
  persen: number
  total: number
  maks: number
  gradeLabel: string
  gradeColor: string
  gradeBg: string
  aspek: { label: string; nilai: number; maks: number }[]
  finalCatatan: string | null
  readAt: string | null
  tanggapan: string | null
}

export function RaporSaya({
  nama,
  role,
  divisi,
  lembagaSlug,
  rapor,
}: {
  nama: string
  role: string
  divisi: string | null
  lembagaSlug: string
  rapor: RaporBulan[]
}) {
  const router = useRouter()
  const [draf, setDraf] = useState<Record<string, string>>(
    () => Object.fromEntries(rapor.map((r) => [r.periodId, r.tanggapan ?? ""])),
  )
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [dibaca, setDibaca] = useState<Record<string, string | null>>(
    () => Object.fromEntries(rapor.map((r) => [r.periodId, r.readAt])),
  )

  const terbaru = rapor[rapor.length - 1] ?? null
  const sebelum = rapor[rapor.length - 2] ?? null
  const delta = terbaru && sebelum ? terbaru.persen - sebelum.persen : null

  const TrendIcon = delta === null ? Minus : delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus
  const warnaDelta = delta === null ? "#94A3B8" : delta > 1 ? "#16A34A" : delta < -1 ? "#DC2626" : "#94A3B8"

  async function tandaiBaca(periodId: string) {
    setSibuk(periodId)
    try {
      const res = await fetch("/api/saya/rapor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, tanggapan: draf[periodId] ?? null }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? "")
      setDibaca((p) => ({ ...p, [periodId]: d.readAt }))
      toast.success("Terima kasih — tanggapan Anda tersimpan")
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Gagal menyimpan")
    } finally {
      setSibuk(null)
    }
  }

  async function keluar() {
    await fetch("/api/auth/karyawan", { method: "DELETE" })
    router.push("/saya")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Kepala ── */}
      <div
        className="rounded-xl px-6 py-5"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
              {lembagaSlug.toUpperCase()} · Rapor Saya
            </p>
            <h1 className="text-xl font-bold text-white leading-tight">{nama}</h1>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              {role}{divisi ? ` · ${divisi}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {terbaru && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {terbaru.label}
                </p>
                <p className="text-2xl font-bold tabular-nums leading-none mt-1" style={{ color: "#E8B84B" }}>
                  {Math.round(terbaru.persen)}%
                </p>
                <span className="flex items-center justify-end gap-1 text-[11px] font-bold mt-1" style={{ color: warnaDelta }}>
                  <TrendIcon size={11} />
                  {delta === null ? "rapor pertama" : `${delta > 0 ? "+" : ""}${Math.round(delta)} poin`}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={keluar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(220,38,38,0.15)", color: "#FCA5A5", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <LogOut size={13} /> Keluar
            </button>
          </div>
        </div>
      </div>

      {rapor.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <FileText size={28} style={{ color: "#CBD5E1" }} className="mx-auto mb-3" />
          <p className="text-sm font-semibold" style={{ color: "#475569" }}>Belum ada rapor yang terbit</p>
          <p className="text-xs mt-1.5 max-w-sm mx-auto" style={{ color: "#94A3B8" }}>
            Rapor muncul di sini setelah periode penilaian ditutup dan hasilnya diterbitkan
            manajemen. Penilaian yang masih berjalan tidak ditampilkan.
          </p>
        </div>
      ) : (
        <>
          {/* ── Tren ── */}
          {rapor.length > 1 && (
            <div className="card px-5 py-4">
              <h2 className="text-sm font-bold mb-4" style={{ color: "#0F2540" }}>Perjalanan Anda</h2>
              <div style={{ width: "100%", height: 220, minWidth: 0 }}>
                <ResponsiveContainer width="99%" height="100%" minWidth={0} debounce={0}>
                  <LineChart
                    data={rapor.map((r) => ({ bulan: r.pendek, Nilai: r.persen }))}
                    margin={{ top: 8, right: 16, bottom: 4, left: -12 }}
                  >
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={{ stroke: "#DDE3EC" }} tickLine={false} />
                    <YAxis
                      domain={[0, 100]} ticks={[0, 56, 71, 86, 100]}
                      tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ReferenceLine y={86} stroke="#BBF7D0" strokeDasharray="4 4" />
                    <ReferenceLine y={71} stroke="#BFDBFE" strokeDasharray="4 4" />
                    <ReferenceLine y={56} stroke="#FDE68A" strokeDasharray="4 4" />
                    <Tooltip
                      formatter={(v) => (typeof v === "number" ? `${Math.round(v)}%` : "—")}
                      contentStyle={{ borderRadius: 8, border: "1px solid #DDE3EC", fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="Nilai" stroke="#C4972A" strokeWidth={2.5} dot={{ r: 4, fill: "#C4972A" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Rapor per bulan ── */}
          {[...rapor].reverse().map((r) => {
            const sudahBaca = !!dibaca[r.periodId]
            return (
              <div key={r.periodId} className="card overflow-hidden">
                <div
                  className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2"
                  style={{ borderBottom: "1px solid #DDE3EC" }}
                >
                  <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>{r.label}</h2>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ backgroundColor: r.gradeBg, color: r.gradeColor }}
                  >
                    {r.gradeLabel}
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "#0F2540" }}>
                    {Math.round(r.persen)}%
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: "#94A3B8" }}>
                    {r.total.toFixed(1)}/{r.maks}
                  </span>

                  {sudahBaca && (
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#16A34A" }}>
                      <Check size={12} /> Sudah dibaca
                    </span>
                  )}
                </div>

                <div className="px-5 py-4 flex flex-col gap-4">
                  {/* Nilai per aspek */}
                  <div className="flex flex-col gap-2">
                    {r.aspek.map((a) => {
                      const persen = (a.nilai / a.maks) * 100
                      return (
                        <div key={a.label} className="flex items-center gap-3">
                          <span className="text-xs w-[150px] shrink-0" style={{ color: "#475569" }}>{a.label}</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${persen}%`,
                                backgroundColor: persen >= 86 ? "#16A34A" : persen >= 71 ? "#3B82F6" : persen >= 56 ? "#F59E0B" : "#DC2626",
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums w-[54px] text-right shrink-0" style={{ color: "#0F2540" }}>
                            {a.nilai.toFixed(1)}/{a.maks}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {r.finalCatatan && (
                    <div
                      className="px-4 py-3 rounded-lg"
                      style={{ backgroundColor: "#F8FAFC", borderLeft: "3px solid #C4972A" }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#94A3B8" }}>
                        Catatan dari atasan
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "#334155" }}>{r.finalCatatan}</p>
                    </div>
                  )}

                  {/* Tanggapan */}
                  <div>
                    <label
                      htmlFor={`tanggapan-${r.periodId}`}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1.5"
                      style={{ color: "#94A3B8" }}
                    >
                      <MessageSquareText size={11} />
                      Tanggapan Anda — apa yang ingin diperbaiki bulan depan?
                    </label>
                    <textarea
                      id={`tanggapan-${r.periodId}`}
                      value={draf[r.periodId] ?? ""}
                      onChange={(e) => setDraf((p) => ({ ...p, [r.periodId]: e.target.value }))}
                      rows={3}
                      placeholder="Opsional. Ini akan dibaca atasan Anda sebagai bahan percakapan."
                      className="w-full px-3 py-2 text-sm rounded-lg border resize-y"
                      style={{ borderColor: "#DDE3EC", outline: "none" }}
                    />
                  </div>
                </div>

                <div
                  className="px-5 py-3 flex items-center justify-end gap-3"
                  style={{ borderTop: "1px solid #EEF2F7", backgroundColor: "#F8FAFC" }}
                >
                  <button
                    type="button"
                    onClick={() => tandaiBaca(r.periodId)}
                    disabled={sibuk === r.periodId}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-60"
                    style={
                      sudahBaca
                        ? { backgroundColor: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0" }
                        : { background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)", color: "#1C1409" }
                    }
                  >
                    {sibuk === r.periodId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {sudahBaca ? "Perbarui tanggapan" : "Saya sudah membaca"}
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}

      <p className="text-xs px-1" style={{ color: "#94A3B8" }}>
        Yang ditampilkan hanya rapor yang sudah diterbitkan. Nama masing-masing penilai
        dan catatan mereka satu per satu tidak ditampilkan — yang Anda baca adalah
        catatan final yang sudah disepakati.
      </p>
    </div>
  )
}
