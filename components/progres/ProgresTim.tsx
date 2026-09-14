"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Check, Copy, MessageCircle, Phone, Clock } from "lucide-react"
import type { ProgresPenilai } from "@/lib/progress"
import { pesanPengingat, normalkanNomor } from "@/lib/reminder-text"
import { ROLE_LABEL } from "@/lib/lembaga"

export function ProgresTim({
  lembagaSlug,
  lembagaLabel,
  period,
  penilai,
  asalTautan,
}: {
  lembagaSlug: string
  lembagaLabel: string
  period: { id: string; label: string; status: string; dapatDinilai: boolean; sisaHari: number | null }
  penilai: ProgresPenilai[]
  asalTautan: string
}) {
  const [disalin, setDisalin] = useState<string | null>(null)

  const totalDitugaskan = penilai.reduce((a, p) => a + p.ditugaskan, 0)
  const totalTerkirim = penilai.reduce((a, p) => a + p.terkirim, 0)
  const persenTotal = totalDitugaskan > 0 ? Math.round((totalTerkirim / totalDitugaskan) * 100) : 0
  const belumSelesai = penilai.filter((p) => p.belum > 0)

  function pesanUntuk(p: ProgresPenilai) {
    return pesanPengingat({
      nama: p.nama,
      lembaga: lembagaSlug,
      periodLabel: period.label,
      belum: p.belum,
      sisaHari: period.sisaHari,
      tautan: `${asalTautan}/${lembagaSlug}/dashboard`,
    })
  }

  async function salin(p: ProgresPenilai) {
    try {
      await navigator.clipboard.writeText(pesanUntuk(p))
      setDisalin(p.evaluatorId)
      toast.success(`Pesan untuk ${p.nama} disalin`)
      setTimeout(() => setDisalin(null), 2000)
    } catch {
      toast.error("Gagal menyalin — silakan salin manual dari pesan di bawah")
    }
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
        <Link
          href={`/${lembagaSlug}/dashboard?periode=${encodeURIComponent(period.id)}`}
          className="inline-flex items-center gap-1.5 text-xs mb-3 hover:underline"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <ArrowLeft size={12} /> Dashboard {lembagaLabel}
        </Link>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
              {lembagaLabel} · {period.label}
            </p>
            <h1 className="text-lg font-bold text-white">Progres pengisian tim</h1>
            {period.sisaHari !== null && (
              <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                <Clock size={12} />
                {period.sisaHari > 0 ? `Sisa ${period.sisaHari} hari` : "Sudah lewat tenggat"}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: "#E8B84B" }}>
              {persenTotal}%
            </p>
            <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              {totalTerkirim} dari {totalDitugaskan} penilaian masuk
            </p>
          </div>
        </div>

        <div className="h-1.5 rounded-full overflow-hidden mt-4" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${persenTotal}%`,
              background: persenTotal === 100
                ? "linear-gradient(90deg,#16A34A,#4ADE80)"
                : "linear-gradient(90deg, #C4972A, #E8B84B)",
              transition: "width .5s cubic-bezier(.22,1,.36,1)",
            }}
          />
        </div>
      </div>

      {/* ── Daftar penilai ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #DDE3EC" }}>
          <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Penilai</h2>
          <span className="text-xs" style={{ color: belumSelesai.length > 0 ? "#B45309" : "#16A34A" }}>
            {belumSelesai.length > 0
              ? `${belumSelesai.length} belum selesai`
              : "semua sudah selesai"}
          </span>
        </div>

        {penilai.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Belum ada penugasan di lembaga ini. Atur lewat menu Penugasan.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F5F8FB" }}>
            {penilai.map((p) => {
              const selesai = p.belum === 0
              const nomor = normalkanNomor(p.phone)
              return (
                <div key={p.evaluatorId} className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2.5">

                  <div className="min-w-[150px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "#0F2540" }}>{p.nama}</span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
                      >
                        {ROLE_LABEL[p.role] ?? p.role}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>
                      {p.terkirim} terkirim
                      {p.draf > 0 && <span style={{ color: "#B45309" }}> · {p.draf} draf</span>}
                      {p.belum > 0 && <span style={{ color: "#B91C1C" }}> · {p.belum} belum</span>}
                    </p>
                  </div>

                  <div className="w-[130px] shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] tabular-nums" style={{ color: "#94A3B8" }}>
                        {p.terkirim}/{p.ditugaskan}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: selesai ? "#16A34A" : "#B45309" }}>
                        {p.persen}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p.persen}%`,
                          backgroundColor: selesai ? "#16A34A" : p.persen > 50 ? "#C4972A" : "#F59E0B",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selesai ? (
                      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#16A34A" }}>
                        <Check size={13} /> Selesai
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => salin(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ color: "#475569", border: "1px solid #E2E8F0" }}
                          title="Salin pesan pengingat"
                        >
                          {disalin === p.evaluatorId ? <Check size={12} /> : <Copy size={12} />}
                          {disalin === p.evaluatorId ? "Disalin" : "Salin pesan"}
                        </button>
                        {nomor ? (
                          <a
                            href={`https://wa.me/${nomor}?text=${encodeURIComponent(pesanUntuk(p))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ backgroundColor: "#25D366" }}
                          >
                            <MessageCircle size={12} /> WhatsApp
                          </a>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg"
                            style={{ color: "#94A3B8", backgroundColor: "#F8FAFC" }}
                            title="Tambahkan nomor di Pengaturan › Anggota agar tombol WhatsApp aktif"
                          >
                            <Phone size={11} /> nomor belum ada
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!period.dapatDinilai && (
        <p className="text-xs px-1" style={{ color: "#94A3B8" }}>
          Periode {period.label} sudah {period.status}. Angka di atas adalah keadaan akhir saat ditutup —
          yang belum mengisi tercatat sebagai tidak mengisi, bukan nilai nol.
        </p>
      )}
    </div>
  )
}
