"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  ChevronLeft, ChevronRight, Check, CloudUpload, Lock, LayoutGrid, Send, AlertCircle,
} from "lucide-react"
import { AG_SECTIONS, type Criterion, type Section } from "@/lib/rubrics"
import { isEkstrem, periksaCatatan, pesanCatatanKurang } from "@/lib/eval-rules"

export type FastEvaluatee = {
  id: string
  name: string
  role: string
  divisi: string | null
  rubricType: "ae" | "ag"
  scores: Record<string, number>
  catatan: Record<string, string>
  status: "belum" | "draf" | "terkirim"
  lalu: Record<string, number>
}

type Props = {
  lembagaSlug: string
  period: { id: string; label: string; status: string; dapatDinilai: boolean; sisaHari: number | null }
  evaluatees: FastEvaluatee[]
  laluLabel: string | null
}

/** Tiap kriteria dipasangkan dengan aspek induknya, untuk aturan catatan. */
type Langkah = { section: Section; criterion: Criterion; nomor: number }

/**
 * Langkah dibatasi pada aspek yang benar-benar dipakai orang-orang yang dinilai.
 * Koordinator yang hanya memegang staff tidak perlu melewati enam layar kosong
 * berisi aspek Leadership dan Manajemen Tim yang tidak berlaku bagi mereka.
 */
function susunLangkah(adaAG: boolean): Langkah[] {
  const dipakai = adaAG ? AG_SECTIONS : AG_SECTIONS.slice(0, 5)
  const out: Langkah[] = []
  let n = 0
  for (const section of dipakai) {
    for (const criterion of section.criteria) {
      out.push({ section, criterion, nomor: ++n })
    }
  }
  return out
}

/** Kriteria F dan G hanya berlaku untuk rubrik AG (pemimpin). */
function berlakuUntuk(rubricType: "ae" | "ag", sectionIndex: number): boolean {
  return rubricType === "ag" || sectionIndex < 5
}

const SKOR_LABEL: Record<number, string> = { 1: "Kurang", 2: "Cukup", 3: "Baik", 4: "Sangat Baik" }

export function FastEvalGrid({ lembagaSlug, period, evaluatees, laluLabel }: Props) {
  const router = useRouter()
  const terkunci = !period.dapatDinilai

  const adaAG = evaluatees.some((e) => e.rubricType === "ag")
  const langkah = useMemo(() => susunLangkah(adaAG), [adaAG])
  const [i, setI] = useState(0)
  const [data, setData] = useState<Record<string, { scores: Record<string, number>; catatan: Record<string, string> }>>(
    () => Object.fromEntries(evaluatees.map((e) => [e.id, { scores: { ...e.scores }, catatan: { ...e.catatan } }]))
  )
  const [simpanState, setSimpanState] = useState<"bersih" | "menyimpan" | "tersimpan">("bersih")
  const [simpanJam, setSimpanJam] = useState<string | null>(null)
  const [mengirim, setMengirim] = useState(false)

  const kini = langkah[i]
  const sectionIndex = AG_SECTIONS.findIndex((s) => s.id === kini.section.id)
  const barisan = evaluatees.filter((e) => berlakuUntuk(e.rubricType, sectionIndex))

  // ── Penyimpanan draf otomatis ─────────────────────────────────────────
  const kotor = useRef<Set<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const simpanDraf = useCallback(async () => {
    const ids = [...kotor.current]
    if (ids.length === 0 || terkunci) return
    kotor.current.clear()
    setSimpanState("menyimpan")
    try {
      const res = await fetch("/api/evaluations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: period.id,
          items: ids.map((id) => ({
            employeeId: id,
            scores: data[id].scores,
            catatan: data[id].catatan,
            status: "draf",
          })),
        }),
      })
      if (!res.ok) throw new Error()
      setSimpanState("tersimpan")
      setSimpanJam(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))
    } catch {
      setSimpanState("bersih")
      ids.forEach((id) => kotor.current.add(id))
    }
  }, [data, period.id, terkunci])

  useEffect(() => {
    if (kotor.current.size === 0) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(simpanDraf, 1500)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [data, simpanDraf])

  function setNilai(empId: string, criterionId: string, nilai: number) {
    if (terkunci) return
    setData((p) => ({
      ...p,
      [empId]: { ...p[empId], scores: { ...p[empId].scores, [criterionId]: nilai } },
    }))
    kotor.current.add(empId)
    setSimpanState("menyimpan")
  }

  function setCatatan(empId: string, sectionId: string, teks: string) {
    if (terkunci) return
    setData((p) => ({
      ...p,
      [empId]: { ...p[empId], catatan: { ...p[empId].catatan, [sectionId]: teks } },
    }))
    kotor.current.add(empId)
  }

  // ── Kemajuan ──────────────────────────────────────────────────────────
  const kemajuan = useMemo(() => {
    let terisi = 0, total = 0
    for (const e of evaluatees) {
      for (const [si, sec] of AG_SECTIONS.entries()) {
        if (!berlakuUntuk(e.rubricType, si)) continue
        for (const c of sec.criteria) {
          total++
          if (data[e.id]?.scores[c.id]) terisi++
        }
      }
    }
    return { terisi, total, persen: total > 0 ? Math.round((terisi / total) * 100) : 0 }
  }, [data, evaluatees])

  const belumDiLangkahIni = barisan.filter((e) => !data[e.id]?.scores[kini.criterion.id]).length

  // ── Pengiriman ────────────────────────────────────────────────────────
  const siapKirim = useMemo(() => {
    return evaluatees.filter((e) => {
      const sections = AG_SECTIONS.filter((_, si) => berlakuUntuk(e.rubricType, si))
      const semua = sections.flatMap((s) => s.criteria.map((c) => c.id))
      const lengkap = semua.every((id) => data[e.id]?.scores[id])
      if (!lengkap) return false
      return periksaCatatan(data[e.id].scores, data[e.id].catatan, sections).ok
    })
  }, [data, evaluatees])

  const kurangCatatan = useMemo(() => {
    return evaluatees
      .map((e) => {
        const sections = AG_SECTIONS.filter((_, si) => berlakuUntuk(e.rubricType, si))
        const semua = sections.flatMap((s) => s.criteria.map((c) => c.id))
        if (!semua.every((id) => data[e.id]?.scores[id])) return null
        const { ok, kurang } = periksaCatatan(data[e.id].scores, data[e.id].catatan, sections)
        return ok ? null : { nama: e.name, pesan: pesanCatatanKurang(kurang) }
      })
      .filter((x): x is { nama: string; pesan: string } => x !== null)
  }, [data, evaluatees])

  async function kirimSemua() {
    if (siapKirim.length === 0) return
    setMengirim(true)
    if (timer.current) clearTimeout(timer.current)
    try {
      const res = await fetch("/api/evaluations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: period.id,
          items: siapKirim.map((e) => ({
            employeeId: e.id,
            scores: data[e.id].scores,
            catatan: data[e.id].catatan,
            status: "terkirim",
          })),
        }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error ?? "")
      toast.success(`${hasil.terkirim} penilaian terkirim untuk ${period.label}`)
      router.push(`/${lembagaSlug}/dashboard?periode=${encodeURIComponent(period.id)}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Gagal mengirim penilaian")
      setMengirim(false)
    }
  }

  function maju()  { setI((v) => Math.min(v + 1, langkah.length - 1)); window.scrollTo({ top: 0, behavior: "smooth" }) }
  function mundur(){ setI((v) => Math.max(v - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }) }

  const diLangkahTerakhir = i === langkah.length - 1

  return (
    <div className="flex flex-col gap-4">

      {/* ── Kepala: aspek, kemajuan, status simpan ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <div className="px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded"
              style={{ backgroundColor: "rgba(196,151,42,0.18)", color: "#E8B84B" }}
            >
              Mode Cepat · {period.label}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              Satu kriteria untuk seluruh tim sekaligus
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              {simpanState === "menyimpan" && (<><CloudUpload size={12} /> Menyimpan…</>)}
              {simpanState === "tersimpan" && (<><Check size={12} /> Tersimpan {simpanJam}</>)}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <span
              className="text-[11px] font-black px-2 py-1 rounded shrink-0 mt-0.5 uppercase"
              style={{ backgroundColor: kini.section.lightBg, color: kini.section.textColor }}
            >
              {kini.section.label.split(".")[0]}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-lg font-bold text-white leading-snug">
                {kini.criterion.label}
              </h1>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                {kini.section.label.replace(/^[A-G]\. /, "")} · kriteria {kini.nomor} dari {langkah.length}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold tabular-nums leading-none" style={{ color: "#E8B84B" }}>
                {kemajuan.persen}%
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                {kemajuan.terisi}/{kemajuan.total} nilai
              </div>
            </div>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden mt-3.5" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${((i + 1) / langkah.length) * 100}%`,
                background: "linear-gradient(90deg, #C4972A, #E8B84B)",
                transition: "width .4s cubic-bezier(.22,1,.36,1)",
              }}
            />
          </div>
        </div>
      </div>

      {terkunci && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold"
          style={{ backgroundColor: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E" }}
        >
          <Lock size={14} /> Periode {period.label} sudah {period.status} — penilaian hanya bisa dilihat.
        </div>
      )}

      {/* ── Baris karyawan untuk kriteria ini ── */}
      <div className="card overflow-hidden">
        <div className="divide-y" style={{ borderColor: "#EEF2F7" }}>
          {barisan.map((e) => {
            const nilai = data[e.id]?.scores[kini.criterion.id] ?? null
            const lalu = e.lalu[kini.criterion.id] ?? null
            const beda = lalu != null && nilai != null ? nilai - Math.round(lalu) : 0
            const butuhCatatan = isEkstrem(nilai)
            const catatanAspek = data[e.id]?.catatan[kini.section.id] ?? ""

            return (
              <div key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">

                  {/* Nama */}
                  <div className="flex items-center gap-2.5 min-w-[168px] flex-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={
                        nilai
                          ? { backgroundColor: "#BBF7D0", color: "#14532D" }
                          : { backgroundColor: "#F3F4F6", color: "#9CA3AF" }
                      }
                    >
                      {e.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate leading-tight">{e.name}</p>
                      <p className="text-[10px] truncate" style={{ color: "#94A3B8" }}>
                        {e.divisi ?? (e.rubricType === "ag" ? "Pemimpin" : "Staff")}
                      </p>
                    </div>
                  </div>

                  {/* Bayangan bulan lalu */}
                  <div className="w-[68px] shrink-0 text-right">
                    {lalu != null ? (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
                        style={{ color: "#94A3B8", backgroundColor: "#F1F5F9" }}
                        title={`Nilai Anda pada ${laluLabel}`}
                      >
                        {laluLabel?.split(" ")[0].slice(0, 3)} {Math.round(lalu)}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: "#CBD5E1" }}>baru</span>
                    )}
                  </div>

                  {/* Pilihan nilai */}
                  <div className="flex gap-1.5 shrink-0">
                    {[1, 2, 3, 4].map((n) => {
                      const pilih = nilai === n
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={terkunci}
                          onClick={() => setNilai(e.id, kini.criterion.id, n)}
                          title={SKOR_LABEL[n]}
                          aria-label={`${e.name}: ${SKOR_LABEL[n]}`}
                          className="w-10 h-10 rounded-lg border-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            borderColor: pilih ? kini.section.color : "#E5E7EB",
                            backgroundColor: pilih ? kini.section.color : "#FAFAFA",
                            color: pilih ? "#fff" : "#94A3B8",
                            transform: pilih ? "scale(1.06)" : "scale(1)",
                          }}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>

                  {/* Penanda perubahan */}
                  <div className="w-[84px] shrink-0">
                    {beda !== 0 && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                        style={
                          beda > 0
                            ? { backgroundColor: "#DCFCE7", color: "#15803D" }
                            : { backgroundColor: "#FEE2E2", color: "#B91C1C" }
                        }
                      >
                        {beda > 0 ? `▲ naik ${beda}` : `▼ turun ${-beda}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Catatan wajib untuk nilai ekstrem */}
                {butuhCatatan && (
                  <div className="mt-2.5 pl-[38px]">
                    <label
                      htmlFor={`catatan-${e.id}-${kini.section.id}`}
                      className="block text-[10px] font-bold uppercase tracking-wide mb-1"
                      style={{ color: catatanAspek.trim() ? "#94A3B8" : "#B45309" }}
                    >
                      {catatanAspek.trim()
                        ? `Catatan aspek ${kini.section.label.replace(/^[A-G]\. /, "")}`
                        : `Nilai ${nilai} butuh catatan — aspek ${kini.section.label.replace(/^[A-G]\. /, "")}`}
                    </label>
                    <textarea
                      id={`catatan-${e.id}-${kini.section.id}`}
                      value={catatanAspek}
                      disabled={terkunci}
                      onChange={(ev) => setCatatan(e.id, kini.section.id, ev.target.value)}
                      rows={2}
                      placeholder={`Apa yang membuat ${e.name} mendapat nilai ${nilai} di aspek ini?`}
                      className="w-full px-3 py-2 text-sm rounded-lg border resize-y"
                      style={{
                        borderColor: catatanAspek.trim() ? "#DDE3EC" : "#FCD34D",
                        backgroundColor: catatanAspek.trim() ? "#fff" : "#FFFBEB",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Navigasi antar kriteria ── */}
        <div
          className="px-4 py-3 flex flex-wrap items-center gap-3"
          style={{ borderTop: "1px solid #DDE3EC", backgroundColor: "#F8FAFC" }}
        >
          <button
            type="button"
            onClick={mundur}
            disabled={i === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 disabled:opacity-40"
            style={{ color: "#6B7280", borderColor: "#E5E7EB" }}
          >
            <ChevronLeft size={15} /> Sebelumnya
          </button>

          <span className="text-xs" style={{ color: belumDiLangkahIni > 0 ? "#B45309" : "#16A34A" }}>
            {belumDiLangkahIni > 0
              ? `${belumDiLangkahIni} dari ${barisan.length} belum dinilai di kriteria ini`
              : `Semua ${barisan.length} sudah dinilai di kriteria ini`}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/${lembagaSlug}/dashboard?periode=${encodeURIComponent(period.id)}`}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ color: "#64748B", border: "1px solid #E2E8F0" }}
            >
              Dashboard
            </Link>
            {diLangkahTerakhir ? (
              <button
                type="button"
                onClick={kirimSemua}
                disabled={mengirim || terkunci || siapKirim.length === 0}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-black disabled:opacity-50"
                style={{
                  background: siapKirim.length > 0 && !terkunci
                    ? "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)"
                    : "#E5E7EB",
                  color: siapKirim.length > 0 && !terkunci ? "#1C1409" : "#9CA3AF",
                }}
              >
                <Send size={14} />
                {mengirim ? "Mengirim…" : `Kirim ${siapKirim.length} penilaian`}
              </button>
            ) : (
              <button
                type="button"
                onClick={maju}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-black"
                style={{
                  background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                  color: "#1C1409",
                }}
              >
                Berikutnya <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Yang menghalangi pengiriman ── */}
      {kurangCatatan.length > 0 && (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} style={{ color: "#B45309" }} />
            <span className="text-sm font-bold" style={{ color: "#92400E" }}>
              {kurangCatatan.length} penilaian lengkap tapi belum bisa dikirim
            </span>
          </div>
          <ul className="flex flex-col gap-1 pl-6">
            {kurangCatatan.map((k) => (
              <li key={k.nama} className="text-xs" style={{ color: "#92400E" }}>
                <b>{k.nama}</b> — {k.pesan}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs px-1" style={{ color: "#94A3B8" }}>
        <LayoutGrid size={12} />
        Menilai satu kriteria untuk semua orang sekaligus membuat perbandingan lebih adil —
        kesan umum terhadap seseorang tidak menular ke semua aspek penilaiannya.
      </div>
    </div>
  )
}
