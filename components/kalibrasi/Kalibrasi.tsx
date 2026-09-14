"use client"

import Link from "next/link"
import { ArrowLeft, Scale, TriangleAlert, Users2, ArrowRight } from "lucide-react"
import type { DataKalibrasi } from "@/lib/calibration"
import { ROLE_LABEL } from "@/lib/lembaga"

function warnaPersen(p: number): { bg: string; color: string } {
  if (p >= 86) return { bg: "#BBF7D0", color: "#14532D" }
  if (p >= 71) return { bg: "#BFDBFE", color: "#1E3A8A" }
  if (p >= 56) return { bg: "#FDE68A", color: "#78350F" }
  return { bg: "#FECACA", color: "#991B1B" }
}

export function Kalibrasi({
  lembagaSlug,
  lembagaLabel,
  period,
  data,
}: {
  lembagaSlug: string
  lembagaLabel: string
  period: { id: string; label: string; status: string }
  data: DataKalibrasi
}) {
  const maksPita = Math.max(1, ...data.pita.map((p) => p.jumlah))
  const adaCatatan = data.penilai.some(
    (p) => Math.abs(p.selisih) >= 0.3 || p.menumpukDi !== null || p.seragam > 0,
  )

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
          href={`/${lembagaSlug}/dashboard?periode=${encodeURIComponent(period.id)}`}
          className="inline-flex items-center gap-1.5 text-xs mb-3 hover:underline"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <ArrowLeft size={12} /> Dashboard {lembagaLabel}
        </Link>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="flex-1 min-w-[240px]">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
              {lembagaLabel} · {period.label}
            </p>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale size={18} color="#E8B84B" /> Kalibrasi
            </h1>
            <p className="text-xs mt-1.5 max-w-xl" style={{ color: "rgba(255,255,255,0.6)" }}>
              Dua hal yang tidak terlihat dari daftar nilai per orang: apakah sebarannya
              masuk akal, dan apakah ada penilai yang ukurannya jauh berbeda dari yang lain.
            </p>
          </div>
          {data.rataLembaga !== null && (
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: "#E8B84B" }}>
                {Math.round(data.rataLembaga)}%
              </p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                rata-rata {data.jumlahDinilai} dari {data.jumlahOrang} orang
              </p>
            </div>
          )}
        </div>
      </div>

      {data.jumlahDinilai === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-sm" style={{ color: "#94A3B8" }}>
            Belum ada penilaian terkirim pada {period.label}. Kalibrasi bisa dilakukan
            setelah jendela pengisian ditutup.
          </p>
        </div>
      ) : (
        <>
          {/* ── Sebaran nilai ── */}
          <div className="card px-5 py-4">
            <h2 className="text-sm font-bold mb-4" style={{ color: "#0F2540" }}>Sebaran predikat</h2>
            <div className="flex flex-col gap-2.5">
              {data.pita.map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-[118px] shrink-0" style={{ color: "#475569" }}>
                    {p.label}
                  </span>
                  <span className="text-[10px] tabular-nums w-[62px] shrink-0" style={{ color: "#94A3B8" }}>
                    {p.batas}
                  </span>
                  <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ backgroundColor: "#F8FAFC" }}>
                    <div
                      className="h-full rounded-md flex items-center justify-end px-2"
                      style={{
                        width: `${Math.max(3, (p.jumlah / maksPita) * 100)}%`,
                        backgroundColor: p.bg,
                        transition: "width .5s cubic-bezier(.22,1,.36,1)",
                      }}
                    >
                      {p.jumlah > 0 && (
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: p.warna }}>
                          {p.jumlah}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Cermin penilai ── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
              <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Kebiasaan tiap penilai</h2>
              <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                Diurutkan dari yang paling jauh dari rata-rata. Ini bahan percakapan,
                bukan penilaian atas penilainya.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: "620px" }}>
                <thead>
                  <tr>
                    {["Penilai", "Dinilai", "Rata-rata butir", "Selisih", "Sebaran", "Nilai ekstrem"].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-bold uppercase tracking-wide px-4 py-2.5"
                        style={{ color: "#94A3B8", borderBottom: "1px solid #EEF2F7" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.penilai.map((p) => {
                    const jauh = Math.abs(p.selisih) >= 0.3
                    return (
                      <tr key={p.evaluatorId}>
                        <td className="px-4 py-3" style={{ borderBottom: "1px solid #F5F8FB" }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: "#0F2540" }}>{p.nama}</span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                              style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
                            >
                              {ROLE_LABEL[p.role] ?? p.role}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums" style={{ borderBottom: "1px solid #F5F8FB", color: "#475569" }}>
                          {p.jumlahDinilai}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold tabular-nums" style={{ borderBottom: "1px solid #F5F8FB", color: "#0F2540" }}>
                          {p.rataButir.toFixed(2)}
                        </td>
                        <td className="px-4 py-3" style={{ borderBottom: "1px solid #F5F8FB" }}>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded tabular-nums"
                            style={
                              !jauh
                                ? { backgroundColor: "#F1F5F9", color: "#64748B" }
                                : p.selisih > 0
                                  ? { backgroundColor: "#FEF3C7", color: "#92400E" }
                                  : { backgroundColor: "#E0F2FE", color: "#075985" }
                            }
                            title={jauh
                              ? (p.selisih > 0 ? "Lebih murah hati dari rata-rata" : "Lebih ketat dari rata-rata")
                              : "Sejalan dengan rata-rata"}
                          >
                            {p.selisih > 0 ? "+" : ""}{p.selisih.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ borderBottom: "1px solid #F5F8FB", color: "#64748B" }}>
                          {p.menumpukDi !== null ? (
                            <span style={{ color: "#B45309" }}>
                              {p.menumpukPersen}% di angka {p.menumpukDi}
                            </span>
                          ) : (
                            "merata"
                          )}
                          {p.seragam > 0 && (
                            <span className="block text-[10px]" style={{ color: "#B91C1C" }}>
                              {p.seragam} orang dinilai sama di semua kriteria
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums" style={{ borderBottom: "1px solid #F5F8FB", color: p.ekstremPersen === 0 ? "#B45309" : "#64748B" }}>
                          {p.ekstremPersen}%
                          {p.ekstremPersen === 0 && (
                            <span className="block text-[10px]">semuanya di tengah</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {adaCatatan && (
              <div
                className="px-5 py-3 flex items-start gap-2"
                style={{ borderTop: "1px solid #EEF2F7", backgroundColor: "#FFFBEB" }}
              >
                <TriangleAlert size={14} style={{ color: "#B45309" }} className="shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: "#92400E" }}>
                  Selisih besar bukan berarti salah — bisa saja tim yang dipegang memang berbeda.
                  Yang perlu dibicarakan adalah kalau selisihnya berulang tiap bulan.
                </p>
              </div>
            )}
          </div>

          {/* ── Urutan nilai ── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
              <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Urutan nilai</h2>
              <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                Kolom rentang menunjukkan selisih terbesar antar penilai untuk orang yang sama —
                beda persepsi besar adalah bahan percakapan, bukan kesalahan.
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "#F5F8FB" }}>
              {data.orang.map((o, i) => {
                const w = warnaPersen(o.persen)
                return (
                  <Link
                    key={o.employeeId}
                    href={`/${lembagaSlug}/orang/${o.employeeId}`}
                    className="px-5 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="text-xs tabular-nums w-5 shrink-0" style={{ color: "#CBD5E1" }}>{i + 1}</span>
                    <div className="min-w-[150px] flex-1">
                      <span className="text-sm font-semibold" style={{ color: "#0F2540" }}>{o.nama}</span>
                      <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                        {ROLE_LABEL[o.role] ?? o.role}{o.divisi ? ` · ${o.divisi}` : ""}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded tabular-nums shrink-0"
                      style={{ backgroundColor: w.bg, color: w.color }}
                    >
                      {Math.round(o.persen)}%
                    </span>
                    <span className="text-[11px] tabular-nums w-[72px] shrink-0" style={{ color: "#94A3B8" }}>
                      {o.total.toFixed(1)}/{o.maks}
                    </span>
                    <span
                      className="text-[11px] flex items-center gap-1 w-[112px] shrink-0"
                      style={{ color: o.jumlahPenilai === 1 ? "#B45309" : "#94A3B8" }}
                    >
                      <Users2 size={11} /> {o.jumlahPenilai} penilai
                    </span>
                    <span
                      className="text-[11px] tabular-nums w-[92px] shrink-0"
                      style={{ color: o.rentang !== null && o.rentang >= 15 ? "#B91C1C" : "#94A3B8" }}
                      title="Selisih terbesar antar penilai"
                    >
                      {o.rentang === null ? "—" : `rentang ${Math.round(o.rentang)}`}
                    </span>
                    <ArrowRight size={13} style={{ color: "#CBD5E1" }} className="shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
