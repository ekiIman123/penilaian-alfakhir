"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CalendarPlus, Loader2, Lock, Play, Square, FileCheck2, Undo2, Users, FileText,
} from "lucide-react"
import { PERIOD_STATUS, isPeriodStatus, BULAN, type PeriodStatus } from "@/lib/period-format"

export type JejakRow = {
  id: string
  actorName: string
  action: string
  detail: string | null
  createdAt: string | Date
}

const LABEL_AKSI: Record<string, string> = {
  "periode.buka":         "membuka periode",
  "periode.draf":         "mengembalikan periode ke draf",
  "periode.tutup":        "menutup pengisian",
  "periode.buka-kembali": "membuka kembali periode yang sudah ditutup",
  "periode.terbitkan":    "menerbitkan rapor",
  "periode.tarik":        "menarik rapor yang sudah terbit",
  "periode.buat":         "membuat periode",
  "penugasan.ubah":       "mengubah penugasan",
  "penugasan.hapus":      "menghapus penugasan",
  "penilaian.hapus":      "menghapus penilaian",
  "karyawan.hapus":       "menghapus karyawan",
  "pengaturan.ubah":      "mengubah pengaturan lembaga",
}

/** Tindakan yang mengubah kesepakatan, layak ditandai lebih tegas. */
const AKSI_BERAT = ["periode.buka-kembali", "periode.tarik", "penilaian.hapus"]

export type PeriodRow = {
  id: string
  year: number
  month: number
  label: string
  status: string
  opensAt: string | Date
  closesAt: string | Date
  publishedAt: string | Date | null
  terkirim: number
  draf: number
  rapor: number
}

/** Aksi yang ditawarkan untuk tiap status — cerminan aturan di sisi server. */
const AKSI: Record<PeriodStatus, { ke: PeriodStatus; label: string; icon: React.ElementType; utama: boolean }[]> = {
  draf:    [{ ke: "dibuka",  label: "Buka periode",      icon: Play,       utama: true  }],
  dibuka:  [{ ke: "ditutup", label: "Tutup pengisian",   icon: Square,     utama: true  },
            { ke: "draf",    label: "Kembalikan ke draf", icon: Undo2,     utama: false }],
  ditutup: [{ ke: "final",   label: "Terbitkan rapor",   icon: FileCheck2, utama: true  },
            { ke: "dibuka",  label: "Buka kembali",      icon: Undo2,      utama: false }],
  final:   [{ ke: "ditutup", label: "Tarik rapor",       icon: Undo2,      utama: false }],
}

function tanggal(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
  })
}

export function PeriodManager({
  lembagaSlug,
  lembagaLabel,
  periods,
  jejak,
}: {
  lembagaSlug: string
  lembagaLabel: string
  periods: PeriodRow[]
  jejak: JejakRow[]
}) {
  const router = useRouter()
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [menambah, setMenambah] = useState(false)

  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [bulan, setBulan] = useState(now.getMonth() + 1)

  async function ubahStatus(id: string, ke: PeriodStatus, label: string) {
    if (ke === "final" && !confirm(
      `Terbitkan rapor ${label}?\n\nAngka setiap orang akan dibekukan sebagai salinan tersendiri ` +
      `dan penilaian tidak bisa diubah lagi.`
    )) return
    if (ke === "ditutup" && !confirm(`Tutup pengisian ${label}?\n\nPenilai tidak bisa mengubah nilai lagi.`)) return

    setSibuk(id)
    try {
      const res = await fetch(`/api/periods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ke }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Gagal mengubah periode")
      toast.success(data.pesan ?? "Periode diperbarui")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah periode")
    } finally {
      setSibuk(null)
    }
  }

  async function tambahPeriode() {
    setMenambah(true)
    try {
      const res = await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lembaga: lembagaSlug, year: tahun, month: bulan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Gagal membuat periode")
      toast.success(`Periode ${BULAN[bulan - 1]} ${tahun} dibuat (${data.status})`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat periode")
    } finally {
      setMenambah(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Judul ── */}
      <div
        className="rounded-xl px-6 py-5"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "rgba(196,151,42,0.85)" }}>
          {lembagaLabel} · Kelola Periode
        </p>
        <h1 className="text-lg font-bold text-white">Siklus penilaian bulanan</h1>
        <p className="text-xs mt-1.5 max-w-xl" style={{ color: "rgba(255,255,255,0.6)" }}>
          Setiap bulan punya periodenya sendiri, dibuka dan ditutup otomatis.
          Hanya periode yang sedang dibuka yang menerima penilaian. Penerbitan rapor
          tetap keputusan Anda — saat diterbitkan, angkanya dibekukan.
        </p>
      </div>

      {/* ── Tambah periode ── */}
      <div className="card px-5 py-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="periode-bulan" className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#94A3B8" }}>
            Bulan
          </label>
          <select
            id="periode-bulan"
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm border bg-white"
            style={{ borderColor: "#DDE3EC", minWidth: "140px" }}
          >
            {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="periode-tahun" className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#94A3B8" }}>
            Tahun
          </label>
          <input
            id="periode-tahun"
            type="number"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm border bg-white tabular-nums"
            style={{ borderColor: "#DDE3EC", width: "100px" }}
          />
        </div>
        <button
          type="button"
          onClick={tambahPeriode}
          disabled={menambah}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#1E3A5F" }}
        >
          {menambah ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
          Buat periode
        </button>
        <p className="text-xs ml-auto max-w-[280px]" style={{ color: "#94A3B8" }}>
          Periode dibuka dan ditutup otomatis sepanjang bulannya: tanggal 1 sampai
          hari terakhir, WIB. Periode bulan berjalan dibuat sendiri oleh sistem.
        </p>
      </div>

      {/* ── Daftar periode ── */}
      <div className="card overflow-hidden">
        {periods.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Belum ada periode. Buat satu di atas untuk memulai siklus bulanan.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#EEF2F7" }}>
            {periods.map((p) => {
              const status: PeriodStatus = isPeriodStatus(p.status) ? p.status : "draf"
              const meta = PERIOD_STATUS[status]
              const aksi = AKSI[status]
              const loading = sibuk === p.id

              return (
                <div key={p.id} className="px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-3">

                  {/* Bulan + status */}
                  <div className="min-w-[170px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: "#0F2540" }}>{p.label}</span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex items-center gap-1"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        {!meta.dapatDinilai && <Lock size={8} />}
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>
                      {tanggal(p.opensAt)} – {tanggal(p.closesAt)}
                    </p>
                  </div>

                  {/* Angka */}
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "#475569" }} title="Penilaian terkirim">
                      <Users size={13} style={{ color: "#94A3B8" }} />
                      <b className="tabular-nums">{p.terkirim}</b> terkirim
                    </span>
                    {p.draf > 0 && (
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "#B45309" }} title="Masih berstatus draf">
                        <b className="tabular-nums">{p.draf}</b> draf
                      </span>
                    )}
                    {p.rapor > 0 && (
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "#1E3A8A" }} title="Rapor yang sudah dibekukan">
                        <FileText size={13} />
                        <b className="tabular-nums">{p.rapor}</b> rapor
                      </span>
                    )}
                  </div>

                  {/* Aksi */}
                  <div className="flex items-center gap-2 ml-auto">
                    {aksi.map(({ ke, label, icon: Icon, utama }) => (
                      <button
                        key={ke}
                        type="button"
                        onClick={() => ubahStatus(p.id, ke, p.label)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                        style={
                          utama
                            ? { backgroundColor: "#1E3A5F", color: "#fff" }
                            : { backgroundColor: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }
                        }
                      >
                        {loading ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Jejak tindakan ── */}
      {jejak.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #DDE3EC" }}>
            <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Jejak tindakan</h2>
            <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
              Membuka kembali periode yang sudah ditutup dan menarik rapor yang sudah terbit
              selalu meninggalkan catatan.
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "#F5F8FB" }}>
            {jejak.map((j) => {
              const berat = AKSI_BERAT.includes(j.action)
              return (
                <div key={j.id} className="px-5 py-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xs tabular-nums shrink-0" style={{ color: "#94A3B8" }}>
                    {new Date(j.createdAt).toLocaleString("id-ID", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "#0F2540" }}>{j.actorName}</span>
                  <span className="text-sm" style={{ color: berat ? "#B91C1C" : "#64748B" }}>
                    {LABEL_AKSI[j.action] ?? j.action}
                  </span>
                  {j.detail && (
                    <span className="text-xs" style={{ color: "#94A3B8" }}>— {j.detail}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
