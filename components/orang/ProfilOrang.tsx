"use client"

import Link from "next/link"
import { useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { ArrowLeft, FileText, Lock, MessageSquareText, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { RiwayatOrang } from "@/lib/person-history"
import { ROLE_LABEL } from "@/lib/lembaga"
import { getNewRubricGrade } from "@/lib/rubrics"

const WARNA_ASPEK = ["#1E3A5F", "#C4972A", "#0E7490", "#7C3AED", "#B45309", "#15803D", "#BE185D"]

function selisihTerakhir(tren: RiwayatOrang["tren"]) {
  const terisi = tren.filter((t) => t.persen !== null)
  if (terisi.length < 2) return null
  return terisi[terisi.length - 1].persen! - terisi[terisi.length - 2].persen!
}

export function ProfilOrang({
  data,
  lembagaSlug,
  bolehLihatCatatan,
}: {
  data: RiwayatOrang
  lembagaSlug: string
  bolehLihatCatatan: boolean
}) {
  const [aspekTampil, setAspekTampil] = useState<string | null>(null)

  const terisi = data.tren.filter((t) => t.persen !== null)
  const terakhir = terisi[terisi.length - 1] ?? null
  const delta = selisihTerakhir(data.tren)
  const grade = terakhir?.total != null ? getNewRubricGrade(terakhir.total, data.rubricType) : null

  const chartData = data.tren.map((t) => {
    const baris: Record<string, string | number | null> = { bulan: t.pendek, Keseluruhan: t.persen }
    data.aspekDipakai.forEach((a, i) => {
      // Aspek ditampilkan dalam skala 1–4; dinaikkan ke persen agar satu sumbu.
      baris[a.label] = t.aspek[i] !== null ? (t.aspek[i]! / 4) * 100 : null
    })
    return baris
  })

  const TrendIcon = delta === null ? Minus : delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus
  const warnaDelta = delta === null ? "#94A3B8" : delta > 1 ? "#16A34A" : delta < -1 ? "#DC2626" : "#94A3B8"

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
        <Link
          href={`/${lembagaSlug}/dashboard`}
          className="inline-flex items-center gap-1.5 text-xs mb-3 hover:underline"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <ArrowLeft size={12} /> Dashboard {lembagaSlug.toUpperCase()}
        </Link>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white leading-tight">{data.nama}</h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}
              >
                {ROLE_LABEL[data.role] ?? data.role}
              </span>
              {data.divisi && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(196,151,42,0.18)", color: "#E8B84B" }}
                >
                  {data.divisi}
                </span>
              )}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
              >
                Rubrik {data.rubricType.toUpperCase()} · maks {terakhir?.maks ?? (data.rubricType === "ae" ? 60 : 84)}
              </span>
            </div>
          </div>

          {terakhir && (
            <div className="flex items-end gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {terakhir.label}
                </p>
                <p className="text-2xl font-bold tabular-nums leading-none mt-1" style={{ color: "#E8B84B" }}>
                  {Math.round(terakhir.persen!)}%
                </p>
              </div>
              {grade && (
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full mb-1"
                  style={{ backgroundColor: grade.bg, color: grade.color }}
                >
                  {grade.label}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs font-bold mb-1.5" style={{ color: warnaDelta }}>
                <TrendIcon size={14} />
                {delta === null ? "bulan pertama" : `${delta > 0 ? "+" : ""}${Math.round(delta)} poin`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tren ── */}
      <div className="card px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Tren bulanan</h2>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAspekTampil(null)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
              style={
                aspekTampil === null
                  ? { backgroundColor: "#0F2540", color: "#fff" }
                  : { backgroundColor: "#F1F5F9", color: "#64748B" }
              }
            >
              Keseluruhan
            </button>
            {data.aspekDipakai.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspekTampil(aspekTampil === a.label ? null : a.label)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                style={
                  aspekTampil === a.label
                    ? { backgroundColor: WARNA_ASPEK[i % WARNA_ASPEK.length], color: "#fff" }
                    : { backgroundColor: "#F1F5F9", color: "#64748B" }
                }
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {terisi.length === 0 ? (
          <p className="text-sm py-10 text-center" style={{ color: "#94A3B8" }}>
            Belum ada penilaian terkirim untuk orang ini.
          </p>
        ) : (
          <div style={{ width: "100%", height: 280, minWidth: 0 }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={0} debounce={0}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
                <CartesianGrid stroke="#EEF2F7" vertical={false} />
                <XAxis
                  dataKey="bulan"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={{ stroke: "#DDE3EC" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 56, 71, 86, 100]}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                {/* Ambang predikat, sama dengan yang dipakai rapor */}
                <ReferenceLine y={86} stroke="#BBF7D0" strokeDasharray="4 4" />
                <ReferenceLine y={71} stroke="#BFDBFE" strokeDasharray="4 4" />
                <ReferenceLine y={56} stroke="#FDE68A" strokeDasharray="4 4" />
                <Tooltip
                  formatter={(v) => (typeof v === "number" ? `${Math.round(v)}%` : "—")}
                  contentStyle={{
                    borderRadius: 8, border: "1px solid #DDE3EC",
                    fontSize: 12, boxShadow: "0 8px 24px rgba(15,37,64,0.12)",
                  }}
                />
                {aspekTampil === null ? (
                  <Line
                    type="monotone" dataKey="Keseluruhan" stroke="#C4972A" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#C4972A" }} activeDot={{ r: 6 }} connectNulls
                  />
                ) : (
                  <Line
                    type="monotone" dataKey={aspekTampil}
                    stroke={WARNA_ASPEK[data.aspekDipakai.findIndex((a) => a.label === aspekTampil) % WARNA_ASPEK.length]}
                    strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Riwayat per bulan ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
          <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Riwayat bulanan</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "#F5F8FB" }}>
          {[...data.tren].reverse().map((t) => (
            <div key={t.periodId} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-sm font-bold min-w-[120px]" style={{ color: "#0F2540" }}>{t.label}</span>

                {t.persen !== null ? (
                  <>
                    <span className="text-sm font-bold tabular-nums" style={{ color: "#0F2540" }}>
                      {Math.round(t.persen)}%
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: "#94A3B8" }}>
                      {t.total?.toFixed(1)}/{t.maks}
                    </span>
                    <span className="text-xs" style={{ color: "#94A3B8" }}>
                      {t.jumlahPenilai} penilai
                    </span>
                  </>
                ) : (
                  <span className="text-xs" style={{ color: "#CBD5E1" }}>belum ada penilaian</span>
                )}

                {t.dibekukan && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                    style={{ backgroundColor: "#DBEAFE", color: "#1E3A8A" }}
                    title="Angka bulan ini sudah dibekukan sebagai rapor"
                  >
                    <Lock size={8} /> RAPOR TERBIT
                  </span>
                )}

                {t.persen !== null && (
                  <a
                    href={`/api/lembaga/${lembagaSlug}/reports/${data.id}/pdf?periode=${encodeURIComponent(t.periodId)}`}
                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    style={{ color: "#475569", border: "1px solid #E2E8F0" }}
                  >
                    <FileText size={12} /> Rapor
                  </a>
                )}
              </div>

              {bolehLihatCatatan && (t.finalCatatan || t.catatan.length > 0) && (
                <div className="mt-2.5 pl-1 flex flex-col gap-1.5">
                  {t.finalCatatan && (
                    <p
                      className="text-xs px-3 py-2 rounded-lg"
                      style={{ backgroundColor: "#F8FAFC", color: "#475569", borderLeft: "2px solid #C4972A" }}
                    >
                      <b>Catatan final:</b> {t.finalCatatan}
                    </p>
                  )}
                  {t.catatan.map((c, i) => (
                    <p key={i} className="text-xs flex gap-1.5" style={{ color: "#64748B" }}>
                      <MessageSquareText size={12} className="shrink-0 mt-0.5" style={{ color: "#CBD5E1" }} />
                      <span><b style={{ color: "#475569" }}>{c.penilai}:</b> {c.teks}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
