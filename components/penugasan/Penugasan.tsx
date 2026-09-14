"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Check, Loader2, Users, Info } from "lucide-react"
import { ROLE_LABEL } from "@/lib/lembaga"
import { BOBOT_PERAN } from "@/lib/weights"

export type PenilaiRow = { id: string; nama: string; role: string; divisi: string | null }
export type KaryawanRow = { id: string; nama: string; role: string; divisi: string | null }
export type PenugasanRow = { evaluatorId: string; employeeId: string; weight: number }

export function Penugasan({
  lembagaSlug,
  lembagaLabel,
  penilai,
  karyawan,
  awal,
}: {
  lembagaSlug: string
  lembagaLabel: string
  penilai: PenilaiRow[]
  karyawan: KaryawanRow[]
  awal: PenugasanRow[]
}) {
  const [peta, setPeta] = useState<Map<string, number>>(
    () => new Map(awal.map((a) => [`${a.evaluatorId}:${a.employeeId}`, a.weight])),
  )
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [dipilih, setDipilih] = useState<string>(penilai[0]?.id ?? "")

  const penilaiAktif = penilai.find((p) => p.id === dipilih) ?? null
  const bobotBaku = penilaiAktif ? (BOBOT_PERAN[penilaiAktif.role] ?? 1) : 1

  async function ubah(employeeId: string, aktif: boolean, weight?: number) {
    if (!penilaiAktif) return
    const kunci = `${penilaiAktif.id}:${employeeId}`
    setSibuk(kunci)
    try {
      const res = await fetch(`/api/lembaga/${lembagaSlug}/assignments`, {
        method: aktif ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluatorId: penilaiAktif.id, employeeId, weight }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? "Gagal menyimpan penugasan")

      setPeta((p) => {
        const baru = new Map(p)
        if (aktif) baru.set(kunci, d.weight ?? weight ?? bobotBaku)
        else baru.delete(kunci)
        return baru
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan penugasan")
    } finally {
      setSibuk(null)
    }
  }

  const ditugaskan = karyawan.filter((k) => peta.has(`${dipilih}:${k.id}`))

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
          <ArrowLeft size={12} /> Dashboard {lembagaLabel}
        </Link>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Users size={18} color="#E8B84B" /> Penugasan penilaian
        </h1>
        <p className="text-xs mt-1.5 max-w-2xl" style={{ color: "rgba(255,255,255,0.6)" }}>
          Siapa menilai siapa. Menambah koordinator baru atau memindahkan seorang staff
          cukup dilakukan di sini — tidak perlu mengubah program. Bobot menentukan
          seberapa besar suara seorang penilai dalam rata-rata akhir.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Daftar penilai ── */}
        <div className="card overflow-hidden w-full lg:w-[260px] shrink-0">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #DDE3EC" }}>
            <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>Penilai</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "#F5F8FB" }}>
            {penilai.map((p) => {
              const jumlah = karyawan.filter((k) => peta.has(`${p.id}:${k.id}`)).length
              const aktif = p.id === dipilih
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDipilih(p.id)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  style={{
                    backgroundColor: aktif ? "#F8FAFC" : "transparent",
                    borderLeft: `3px solid ${aktif ? "#C4972A" : "transparent"}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: "#0F2540" }}>{p.nama}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0"
                      style={{ backgroundColor: jumlah > 0 ? "#DCFCE7" : "#FEF3C7", color: jumlah > 0 ? "#15803D" : "#92400E" }}
                    >
                      {jumlah}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>
                    {ROLE_LABEL[p.role] ?? p.role} · bobot baku {BOBOT_PERAN[p.role] ?? 1}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Karyawan yang bisa ditugaskan ── */}
        <div className="card overflow-hidden flex-1 min-w-0 w-full">
          <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-2" style={{ borderBottom: "1px solid #DDE3EC" }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "#0F2540" }}>
                {penilaiAktif ? `Dinilai oleh ${penilaiAktif.nama}` : "Pilih penilai"}
              </h2>
              {penilaiAktif && (
                <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                  {ditugaskan.length} orang ditugaskan
                </p>
              )}
            </div>
          </div>

          {!penilaiAktif ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm" style={{ color: "#94A3B8" }}>Belum ada penilai di lembaga ini.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F5F8FB" }}>
              {karyawan.map((k) => {
                const kunci = `${penilaiAktif.id}:${k.id}`
                const aktif = peta.has(kunci)
                const bobot = peta.get(kunci) ?? bobotBaku
                const loading = sibuk === kunci
                const diriSendiri = k.nama.trim().toLowerCase() === penilaiAktif.nama.trim().toLowerCase()

                return (
                  <div key={k.id} className="px-5 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="flex items-center gap-3 flex-1 min-w-[190px] cursor-pointer">
                      <input
                        id={`tugas-${k.id}`}
                        type="checkbox"
                        checked={aktif}
                        disabled={loading || diriSendiri}
                        onChange={(e) => ubah(k.id, e.target.checked)}
                        className="w-4 h-4 shrink-0"
                        style={{ accentColor: "#C4972A" }}
                      />
                      <span className="min-w-0">
                        <span className="text-sm font-semibold block truncate" style={{ color: diriSendiri ? "#CBD5E1" : "#0F2540" }}>
                          {k.nama}
                        </span>
                        <span className="text-[11px]" style={{ color: "#94A3B8" }}>
                          {ROLE_LABEL[k.role] ?? k.role}{k.divisi ? ` · ${k.divisi}` : ""}
                          {diriSendiri && " · tidak bisa menilai diri sendiri"}
                        </span>
                      </span>
                    </label>

                    {aktif && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label htmlFor={`bobot-${k.id}`} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                          Bobot
                        </label>
                        <input
                          id={`bobot-${k.id}`}
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="5"
                          defaultValue={bobot}
                          disabled={loading}
                          onBlur={(e) => {
                            const v = Number(e.target.value)
                            if (v > 0 && v !== bobot) ubah(k.id, true, v)
                          }}
                          className="w-[68px] px-2 py-1 text-sm rounded-lg border tabular-nums"
                          style={{ borderColor: "#DDE3EC", outline: "none" }}
                        />
                        {loading ? (
                          <Loader2 size={13} className="animate-spin" style={{ color: "#94A3B8" }} />
                        ) : (
                          <Check size={13} style={{ color: "#16A34A" }} />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3 flex items-start gap-2"
        style={{ backgroundColor: "#F8FAFC", border: "1px solid #DDE3EC" }}
      >
        <Info size={14} style={{ color: "#64748B" }} className="shrink-0 mt-0.5" />
        <p className="text-xs" style={{ color: "#64748B" }}>
          Bobot bersifat relatif, bukan persentase — yang dipakai adalah perbandingan antar
          penilai yang benar-benar mengisi. Staff yang dinilai koordinator (1,0) dan
          supervisor (0,7) menghasilkan pembagian sekitar 59% dan 41%. Menghapus penugasan
          tidak menghapus penilaian yang sudah masuk.
        </p>
      </div>
    </div>
  )
}
