"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getSectionsForRubric, getNewRubricGrade, type Criterion, type Section } from "@/lib/rubrics"
import { Check, ChevronLeft } from "lucide-react"

interface Props {
  lembagaSlug: "iysa" | "icgi" | "iyora"
  evaluatorId: string
  employeeId: string
  employeeName: string
  employeeRole: string
  employeeDivisi: string | null
  rubricType: "ae" | "ag"
  existing?: { scores: Record<string, number>; catatan: string | null } | null
}

const SCORE_LABELS: Record<number, string> = { 1: "Kurang", 2: "Cukup", 3: "Baik", 4: "Sangat Baik" }

function CriterionCard({
  criterion, value, sectionColor, onChange,
}: {
  criterion: Criterion
  value: number | null
  sectionColor: string
  onChange: (score: number) => void
}) {
  return (
    <div
      className="rounded-2xl bg-white"
      style={{
        borderLeft: `4px solid ${value ? sectionColor : "#DDE3EC"}`,
        boxShadow: value
          ? `0 1px 6px rgba(0,0,0,0.06), 0 0 0 1px ${sectionColor}1A`
          : "0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px #DDE3EC",
        padding: "1rem 1.1rem",
      }}
    >
      <div className="flex items-start gap-2.5 mb-3">
        <p className="flex-1 font-semibold text-sm text-gray-800 leading-snug">{criterion.label}</p>
        {value && (
          <span
            className="text-xs font-black px-2 py-0.5 rounded-full shrink-0"
            style={{ color: sectionColor, backgroundColor: `${sectionColor}18` }}
          >
            {value}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => {
          const sel = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="h-12 flex flex-col items-center justify-center rounded-xl border-2 transition-colors focus:outline-none"
              style={{
                borderColor: sel ? sectionColor : "#E5E7EB",
                backgroundColor: sel ? sectionColor : "#FAFAFA",
                boxShadow: sel ? `0 4px 12px ${sectionColor}35` : "none",
              }}
            >
              <span
                className="text-lg font-black leading-none"
                style={{ color: sel ? "#FFF" : "#9CA3AF" }}
              >
                {n}
              </span>
              <span
                className="text-[9px] font-semibold mt-0.5 leading-none"
                style={{ color: sel ? "rgba(255,255,255,0.8)" : "#D1D5DB" }}
              >
                {SCORE_LABELS[n]}
              </span>
            </button>
          )
        })}
      </div>

      {value && (
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${sectionColor}20` }}>
          {criterion.options
            .filter((o) => o.score === value)
            .map((opt) => (
              <div
                key={opt.score}
                className="flex gap-2.5 px-3 py-2"
                style={{ backgroundColor: `${sectionColor}0E`, borderLeft: `3px solid ${sectionColor}` }}
              >
                <p className="text-xs leading-relaxed flex-1" style={{ color: "#374151" }}>
                  <span className="font-semibold mr-1" style={{ color: sectionColor }}>
                    {SCORE_LABELS[opt.score]} —
                  </span>
                  {opt.text}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export function EvalForm({
  lembagaSlug, evaluatorId, employeeId, employeeName, employeeRole, employeeDivisi, rubricType, existing,
}: Props) {
  const router = useRouter()
  const sections: Section[] = getSectionsForRubric(rubricType)
  const [scores, setScores] = useState<Record<string, number>>(existing?.scores ?? {})
  const [catatan, setCatatan] = useState(existing?.catatan ?? "")
  const [submitting, setSubmitting] = useState(false)

  const allIds = sections.flatMap((s) => s.criteria.map((c) => c.id))
  const filled = allIds.filter((id) => scores[id]).length
  const totalRaw = allIds.reduce((sum, id) => sum + (scores[id] ?? 0), 0)
  const grade = getNewRubricGrade(totalRaw, rubricType)
  const maxTotal = rubricType === "ae" ? 56 : 80

  function setScore(id: string, sc: number) {
    setScores((p) => ({ ...p, [id]: sc }))
  }

  async function submit() {
    const missing = allIds.filter((id) => !scores[id])
    if (missing.length > 0) {
      toast.error(`Masih ada ${missing.length} kriteria yang belum dinilai`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluatorId,
          teacherId: employeeId,
          scores,
          catatan: catatan.trim() || null,
          rubricType,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Penilaian berhasil disimpan!")
      router.push(`/${lembagaSlug}/dashboard`)
      router.refresh()
    } catch {
      toast.error("Gagal menyimpan penilaian. Coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/${lembagaSlug}/dashboard`)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} /> Kembali
        </button>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "rgba(196,151,42,0.12)", color: "#B8860B" }}
        >
          Rubrik {rubricType.toUpperCase()} · {sections.length} aspek
        </span>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.85)" }}>
              Menilai
            </p>
            <h1 className="text-xl font-bold text-white leading-tight">{employeeName}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}>
                {employeeRole}
              </span>
              {employeeDivisi && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(196,151,42,0.18)", color: "#E8B84B" }}>
                  {employeeDivisi}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums" style={{ color: grade.color }}>
              {totalRaw}
              <span className="text-base font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>/{maxTotal}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
              {filled}/{allIds.length} kriteria
            </p>
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />
      </div>

      {sections.map((s) => (
        <div key={s.id} className="card">
          <div className="px-5 py-4 text-white" style={{ backgroundColor: s.color }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg tracking-wide">{s.label}</h2>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
              >
                {s.criteria.filter((c) => scores[c.id]).length}/{s.criteria.length}
              </span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {s.criteria.map((c) => (
              <CriterionCard
                key={c.id}
                criterion={c}
                value={scores[c.id] ?? null}
                sectionColor={s.color}
                onChange={(sc) => setScore(c.id, sc)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <div className="px-5 py-3.5 border-b" style={{ borderColor: "#DDE3EC" }}>
          <h3 className="font-bold text-gray-800">Catatan Khusus</h3>
          <p className="text-xs text-gray-400 mt-0.5">Opsional</p>
        </div>
        <div className="p-5">
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={4}
            placeholder="Tuliskan catatan khusus jika diperlukan..."
            className="w-full px-3.5 py-3 border-2 border-gray-200 rounded-xl text-sm resize-none transition-colors"
            style={{ outline: "none" }}
            onFocus={(e) => (e.target.style.borderColor = "#C4972A")}
            onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
          />
        </div>
      </div>

      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)" }}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
            Total Nilai
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black" style={{ color: grade.color }}>{totalRaw}<span className="text-sm text-white/40">/{maxTotal}</span></span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ color: grade.color, backgroundColor: grade.bg }}>
              {grade.label}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
            color: "#1C1409",
            boxShadow: "0 3px 14px rgba(196,151,42,0.42)",
          }}
        >
          <Check size={16} />
          {submitting ? "Menyimpan..." : "Simpan Penilaian"}
        </button>
      </div>
    </div>
  )
}
