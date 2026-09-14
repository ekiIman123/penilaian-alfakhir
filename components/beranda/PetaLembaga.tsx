"use client"

import Link from "next/link"
import { TrendingDown, CircleAlert, UserX, Users2, ArrowRight, Lock } from "lucide-react"
import type { BarisPeta, Perhatian } from "@/lib/overview"
import { ROLE_LABEL } from "@/lib/lembaga"

/**
 * Warna sel peta mengikuti predikat rubrik — ambang yang sama dengan yang
 * dipakai di rapor, bukan skala warna yang berdiri sendiri.
 */
function warnaPersen(p: number | null): { bg: string; color: string } {
  if (p === null) return { bg: "#F1F5F9", color: "#CBD5E1" }
  if (p >= 86) return { bg: "#BBF7D0", color: "#14532D" }
  if (p >= 71) return { bg: "#BFDBFE", color: "#1E3A8A" }
  if (p >= 56) return { bg: "#FDE68A", color: "#78350F" }
  return { bg: "#FECACA", color: "#991B1B" }
}

const IKON_PERHATIAN = {
  turun:     { Icon: TrendingDown, warna: "#B91C1C", bg: "#FEE2E2", label: "Turun tajam" },
  rendah:    { Icon: CircleAlert,  warna: "#B45309", bg: "#FEF3C7", label: "Nilai rendah" },
  belum:     { Icon: UserX,        warna: "#64748B", bg: "#F1F5F9", label: "Belum dinilai" },
  sendirian: { Icon: Users2,       warna: "#0369A1", bg: "#E0F2FE", label: "Satu penilai" },
} as const

export function PetaLembaga({
  nama,
  peta,
  perhatian,
  tugasSaya,
}: {
  nama: string
  peta: BarisPeta[]
  perhatian: Perhatian[]
  tugasSaya: { lembaga: string; label: string; periodId: string; belum: number; total: number }[]
}) {
  const bulan = peta[0]?.sel ?? []
  const adaTugas = tugasSaya.some((t) => t.belum > 0)

  return (
    <div className="flex flex-col gap-5">

      {/* ── Sambutan ── */}
      <div
        className="rounded-xl px-6 py-5"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "rgba(196,151,42,0.85)" }}>
          Beranda Manajemen
        </p>
        <h1 className="text-lg font-bold text-white">{nama}</h1>
        <p className="text-xs mt-1.5 max-w-2xl" style={{ color: "rgba(255,255,255,0.6)" }}>
          Tiga lembaga, enam bulan terakhir. Warna mengikuti predikat rubrik yang sama
          dengan rapor. Klik satu bulan untuk membuka dashboard lembaga itu.
        </p>
      </div>

      {/* ── Tugas menilai sendiri ── */}
      {adaTugas && (
        <div className="card px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Tugas menilai Anda</h2>
            <span className="text-xs" style={{ color: "#94A3B8" }}>
              Anda hanya menilai para pemimpin
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {tugasSaya.filter((t) => t.belum > 0).map((t) => (
              <Link
                key={t.lembaga}
                href={`/${t.lembaga}/dashboard?periode=${encodeURIComponent(t.periodId)}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-slate-50"
                style={{ border: "1px solid #DDE3EC" }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: "#0F2540" }}>{t.lembaga.toUpperCase()}</p>
                  <p className="text-[11px]" style={{ color: "#94A3B8" }}>{t.label}</p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-1 rounded"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  {t.belum} dari {t.total} belum
                </span>
                <ArrowRight size={14} style={{ color: "#CBD5E1" }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Peta ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
          <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Peta nilai per lembaga</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: "560px" }}>
            <thead>
              <tr>
                <th
                  className="text-left text-[10px] font-bold uppercase tracking-wide px-5 py-2.5"
                  style={{ color: "#94A3B8", borderBottom: "1px solid #EEF2F7" }}
                >
                  Lembaga
                </th>
                {bulan.map((b) => (
                  <th
                    key={b.pendek}
                    className="text-center text-[10px] font-bold uppercase tracking-wide px-2 py-2.5"
                    style={{ color: "#94A3B8", borderBottom: "1px solid #EEF2F7" }}
                  >
                    {b.pendek}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peta.map((baris) => (
                <tr key={baris.lembaga}>
                  <td className="px-5 py-3" style={{ borderBottom: "1px solid #F5F8FB" }}>
                    <Link
                      href={`/${baris.lembaga}/dashboard`}
                      className="text-sm font-bold hover:underline"
                      style={{ color: "#0F2540" }}
                    >
                      {baris.label}
                    </Link>
                  </td>
                  {baris.sel.map((sel, i) => {
                    const w = warnaPersen(sel.persen)
                    const isi = (
                      <div
                        className="mx-auto rounded-lg flex flex-col items-center justify-center"
                        style={{ backgroundColor: w.bg, width: "62px", height: "44px" }}
                        title={
                          sel.persen !== null
                            ? `${sel.label}: ${Math.round(sel.persen)}% · ${sel.dinilai} dari ${sel.jumlahOrang} orang dinilai`
                            : sel.status === "tidak ada"
                              ? "Periode belum dibuat"
                              : `${sel.label}: belum ada penilaian`
                        }
                      >
                        <span className="text-sm font-bold tabular-nums leading-none" style={{ color: w.color }}>
                          {sel.persen !== null ? `${Math.round(sel.persen)}%` : "—"}
                        </span>
                        {sel.persen !== null && (
                          <span className="text-[9px] leading-none mt-1 tabular-nums" style={{ color: w.color, opacity: 0.7 }}>
                            {sel.dinilai}/{sel.jumlahOrang}
                          </span>
                        )}
                      </div>
                    )
                    return (
                      <td key={`${baris.lembaga}-${i}`} className="px-2 py-2" style={{ borderBottom: "1px solid #F5F8FB" }}>
                        {sel.periodId ? (
                          <Link href={`/${baris.lembaga}/dashboard?periode=${encodeURIComponent(sel.periodId)}`}>
                            {isi}
                          </Link>
                        ) : isi}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 flex flex-wrap gap-x-4 gap-y-1.5" style={{ borderTop: "1px solid #EEF2F7" }}>
          {[
            { l: "Sangat Baik", p: 90 }, { l: "Baik", p: 75 },
            { l: "Cukup", p: 60 }, { l: "Perlu Perbaikan", p: 40 },
          ].map((x) => {
            const w = warnaPersen(x.p)
            return (
              <span key={x.l} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#94A3B8" }}>
                <span className="w-3 h-3 rounded" style={{ backgroundColor: w.bg }} />
                {x.l}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Perlu perhatian ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #DDE3EC" }}>
          <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Perlu perhatian</h2>
          <span className="text-xs" style={{ color: "#94A3B8" }}>
            {perhatian.length > 0 ? `${perhatian.length} baris` : "tidak ada"}
          </span>
        </div>

        {perhatian.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Tidak ada yang menonjol pada periode berjalan.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F5F8FB" }}>
            {perhatian.map((x) => {
              const meta = IKON_PERHATIAN[x.jenis]
              const Icon = meta.Icon
              return (
                <Link
                  key={`${x.lembaga}-${x.employeeId}-${x.jenis}`}
                  href={`/${x.lembaga}/orang/${x.employeeId}`}
                  className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 transition-colors hover:bg-slate-50"
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: meta.bg }}
                  >
                    <Icon size={14} style={{ color: meta.warna }} />
                  </span>
                  <div className="min-w-[150px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "#0F2540" }}>{x.nama}</span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
                      >
                        {x.lembaga}
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                      {ROLE_LABEL[x.role] ?? x.role}{x.divisi ? ` · ${x.divisi}` : ""}
                    </p>
                  </div>
                  <span className="text-xs flex-1 min-w-[180px]" style={{ color: meta.warna }}>
                    {x.pesan}
                  </span>
                  {x.persen !== null && (
                    <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#0F2540" }}>
                      {Math.round(x.persen)}%
                    </span>
                  )}
                  <ArrowRight size={13} style={{ color: "#CBD5E1" }} className="shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs px-1 flex items-center gap-1.5" style={{ color: "#94A3B8" }}>
        <Lock size={11} />
        Nilai yang ditampilkan adalah rata-rata tertimbang dari penilai yang sudah mengirim.
        Penilai yang belum mengisi tidak dihitung sebagai nol.
      </p>
    </div>
  )
}
