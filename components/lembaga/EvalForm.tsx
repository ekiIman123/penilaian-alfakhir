"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getSectionsForRubric, getNewRubricGrade, type Criterion, type Section } from "@/lib/rubrics"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"

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

// ── Score Ring SVG ───────────────────────────────────────────────
function ScoreRing({ total, max, color, size = 100 }: { total: number; max: number; color: string; size?: number }) {
  const r = size * 0.41
  const circ = 2 * Math.PI * r
  const cx = size / 2
  const pct = max > 0 ? total / max : 0
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block mx-auto">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E7EB" strokeWidth={size * 0.09} />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none" stroke={color}
        strokeWidth={size * 0.09}
        strokeDasharray={circ}
        strokeDashoffset={circ - pct * circ}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text x={cx} y={cx - size * 0.04} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight="900" fill={color}>{total}</text>
      <text x={cx} y={cx + size * 0.17} textAnchor="middle"
        fontSize={size * 0.1} fill="#9CA3AF">/ {max}</text>
    </svg>
  )
}

// ── Left Sidebar ────────────────────────────────────────────────
function LeftSidebar({
  sections, step, scores, employeeName, employeeRole, employeeDivisi,
  rubricType, totalFilled, totalCriteria, onNavigate,
}: {
  sections: Section[]
  step: number
  scores: Record<string, number>
  employeeName: string
  employeeRole: string
  employeeDivisi: string | null
  rubricType: "ae" | "ag"
  totalFilled: number
  totalCriteria: number
  onNavigate: (s: number) => void
}) {
  const totalRaw = Object.values(scores).reduce((a, b) => a + b, 0)
  const max = rubricType === "ae" ? 56 : 80
  const grade = getNewRubricGrade(totalRaw, rubricType)
  const isFinalStep = step === sections.length

  return (
    <div className="flex flex-col gap-4">
      {/* Employee info */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)",
          boxShadow: "0 4px 16px rgba(15,37,64,0.22)",
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.75)" }}>
          Menilai
        </p>
        <div>
          <p className="text-sm font-bold text-white leading-snug">{employeeName}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
            >
              {employeeRole}
            </span>
            {employeeDivisi && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(196,151,42,0.18)", color: "#E8B84B" }}
              >
                {employeeDivisi}
              </span>
            )}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
            >
              Rubrik {rubricType.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Section navigation */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}
      >
        <div
          className="px-4 py-2.5"
          style={{ background: "linear-gradient(135deg, #0F2540, #1E3A5F)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
            Langkah {Math.min(step + 1, sections.length + 1)} / {sections.length + 1}
          </p>
        </div>
        <div className="bg-white divide-y divide-gray-50">
          {sections.map((s, i) => {
            const filled = s.criteria.filter((c) => scores[c.id]).length
            const done = filled === s.criteria.length
            const isCurrent = step === i
            const canClick = i <= step

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => canClick && onNavigate(i)}
                disabled={!canClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left disabled:cursor-default"
                style={{
                  backgroundColor: isCurrent ? `${s.color}10` : "transparent",
                  borderLeft: isCurrent ? `3px solid ${s.color}` : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent && canClick)
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(30,58,95,0.05)"
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent)
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                  style={{
                    backgroundColor: done ? "#DCFCE7" : isCurrent ? `${s.color}18` : "#F9FAFB",
                    border: isCurrent ? `2px solid ${s.color}` : done ? "2px solid #BBF7D0" : "2px solid transparent",
                  }}
                >
                  {done
                    ? <Check size={11} color="#15803D" />
                    : <span className="text-[11px] font-black" style={{ color: isCurrent ? s.color : "#9CA3AF" }}>
                        {s.label.split(".")[0].trim()}
                      </span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold truncate leading-tight"
                    style={{ color: isCurrent ? s.color : done ? "#374151" : "#9CA3AF" }}
                  >
                    {s.label}
                  </p>
                  <p className="text-[10px]" style={{ color: done ? "#15803D" : "#9CA3AF" }}>
                    {filled}/{s.criteria.length}{done ? " ✓" : ""}
                  </p>
                </div>
              </button>
            )
          })}

          {/* Final step: Selesai */}
          <button
            type="button"
            onClick={() => step >= sections.length && onNavigate(sections.length)}
            disabled={step < sections.length}
            className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left disabled:cursor-default"
            style={{
              backgroundColor: isFinalStep ? "rgba(196,151,42,0.10)" : "transparent",
              borderLeft: isFinalStep ? "3px solid #C4972A" : "3px solid transparent",
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
              style={{
                backgroundColor: isFinalStep ? "rgba(196,151,42,0.18)" : "#F9FAFB",
                border: isFinalStep ? "2px solid #C4972A" : "2px solid transparent",
              }}
            >
              <span className="text-sm">✅</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: isFinalStep ? "#C4972A" : "#9CA3AF" }}>
                Selesai
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Live score */}
      {totalFilled > 0 && (
        <div
          className="rounded-2xl p-4 flex flex-col items-center gap-2"
          style={{
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
            Skor Sementara
          </p>
          <ScoreRing total={totalRaw} max={max} color={grade.color} size={88} />
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ color: grade.color, backgroundColor: grade.bg }}
          >
            {grade.label}
          </span>
          <p className="text-[10px] text-center" style={{ color: "#9CA3AF" }}>
            {totalFilled} / {totalCriteria} kriteria terisi
          </p>
        </div>
      )}
    </div>
  )
}

// ── Criterion Card ──────────────────────────────────────────────
function CriterionCard({
  criterion, value, index, sectionColor, onChange, onFocus,
}: {
  criterion: Criterion
  value: number | null
  index: number
  sectionColor: string
  onChange: (score: number) => void
  onFocus: () => void
}) {
  const [hov, setHov] = useState<number | null>(null)

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
      onMouseEnter={onFocus}
    >
      <div className="flex items-start gap-2.5 mb-3">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5"
          style={{ backgroundColor: value ? sectionColor : "#D1D5DB" }}
        >
          {index + 1}
        </span>
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

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((n) => {
          const sel = value === n
          const isHov = hov === n
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => { setHov(n); onFocus() }}
              onMouseLeave={() => setHov(null)}
              onClick={() => onChange(n)}
              className="flex-1 h-12 flex flex-col items-center justify-center rounded-xl border-2 transition-all focus:outline-none"
              style={{
                borderColor: sel || isHov ? sectionColor : "#E5E7EB",
                backgroundColor: sel ? sectionColor : isHov ? `${sectionColor}12` : "#FAFAFA",
                transform: sel ? "scale(1.04)" : "scale(1)",
                boxShadow: sel ? `0 4px 12px ${sectionColor}35` : "none",
              }}
            >
              <span
                className="text-lg font-black leading-none"
                style={{ color: sel ? "#FFF" : isHov ? sectionColor : "#9CA3AF" }}
              >
                {n}
              </span>
              <span
                className="text-[9px] font-semibold mt-0.5 leading-none"
                style={{ color: sel ? "rgba(255,255,255,0.8)" : isHov ? `${sectionColor}BB` : "#D1D5DB" }}
              >
                {SCORE_LABELS[n]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Mobile only: show rubric text */}
      <div className="lg:hidden mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${sectionColor}20` }}>
        {([4, 3, 2, 1] as const).map((n, ni) => {
          const opt = criterion.options.find((o) => o.score === n)
          if (!opt) return null
          const isSel = value === n
          return (
            <div
              key={n}
              className="flex gap-2.5 px-3 py-2"
              style={{
                backgroundColor: isSel ? `${sectionColor}0E` : ni % 2 === 0 ? "#FAFAFA" : "white",
                borderBottom: ni < 3 ? `1px solid ${sectionColor}10` : "none",
                borderLeft: isSel ? `3px solid ${sectionColor}` : "3px solid transparent",
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                style={{
                  backgroundColor: isSel ? sectionColor : "#E5E7EB",
                  color: isSel ? "white" : "#9CA3AF",
                }}
              >
                {n}
              </div>
              <p className="text-xs leading-relaxed flex-1" style={{ color: isSel ? "#374151" : "#9CA3AF" }}>
                <span className="font-semibold mr-1" style={{ color: isSel ? sectionColor : "#B0AEAD" }}>
                  {SCORE_LABELS[n]} —
                </span>
                {opt.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Right Rubric Panel ───────────────────────────────────────────
function RubricPanel({
  section, focusedId, scores, sections, rubricType, isFinalStep,
}: {
  section: Section | null
  focusedId: string | null
  scores: Record<string, number>
  sections: Section[]
  rubricType: "ae" | "ag"
  isFinalStep: boolean
}) {
  const max = rubricType === "ae" ? 56 : 80
  const totalRaw = Object.values(scores).reduce((a, b) => a + b, 0)
  const grade = getNewRubricGrade(totalRaw, rubricType)

  if (isFinalStep) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)" }}
      >
        <div
          className="px-4 py-3.5"
          style={{ background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
            Rekap Per Aspek
          </p>
        </div>
        <div className="bg-white p-4 space-y-3">
          {sections.map((s) => {
            const raw = s.criteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0)
            const pct = (raw / s.maxScore) * 100
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600 truncate max-w-[120px]">{s.label}</span>
                  <span className="text-xs font-bold shrink-0 ml-1" style={{ color: s.color }}>{raw}/{s.maxScore}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: s.color, transition: "width 0.5s" }}
                  />
                </div>
              </div>
            )
          })}
          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "#DDE3EC" }}>
            <span className="text-sm font-bold text-gray-700">Total</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black" style={{ color: grade.color }}>{totalRaw}<span className="text-sm text-gray-400">/{max}</span></span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ color: grade.color, backgroundColor: grade.bg }}>
                {grade.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!section) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)",
          boxShadow: "0 4px 24px rgba(28,14,4,0.3)",
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(196,151,42,0.85)" }}>
          Skala Penilaian
        </p>
        <div className="space-y-2">
          {([4, 3, 2, 1] as const).map((n) => {
            const meta = {
              4: { c: "#15803D", bg: "#DCFCE7", desc: "Selalu / Sangat Baik" },
              3: { c: "#1D4ED8", bg: "#DBEAFE", desc: "Sering / Baik" },
              2: { c: "#B45309", bg: "#FEF3C7", desc: "Jarang / Cukup" },
              1: { c: "#DC2626", bg: "#FEE2E2", desc: "Tidak Pernah / Kurang" },
            }[n]
            return (
              <div key={n} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: meta.bg }}>
                <span className="text-xl font-black w-7 text-center shrink-0" style={{ color: meta.c }}>{n}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: meta.c }}>{SCORE_LABELS[n]}</p>
                  <p className="text-[10px]" style={{ color: `${meta.c}AA` }}>{meta.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const focused = focusedId ? section.criteria.find((c) => c.id === focusedId) : null

  if (focused) {
    const sel = scores[focused.id] ?? null
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)" }}
      >
        <div className="px-4 py-3.5" style={{ backgroundColor: section.color }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
            Rubrik Kriteria
          </p>
          <p className="text-sm font-bold text-white mt-0.5 leading-snug">{focused.label}</p>
        </div>
        <div className="bg-white divide-y" style={{ borderColor: "#EDF0F5" }}>
          {([4, 3, 2, 1] as const).map((n) => {
            const opt = focused.options.find((o) => o.score === n)
            if (!opt) return null
            const isSel = sel === n
            return (
              <div
                key={n}
                className="flex gap-3 px-4 py-3"
                style={{
                  backgroundColor: isSel ? `${section.color}0D` : "transparent",
                  borderLeft: isSel ? `3px solid ${section.color}` : "3px solid transparent",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{
                    backgroundColor: isSel ? section.color : "#F3F4F6",
                    color: isSel ? "white" : "#9CA3AF",
                  }}
                >
                  {n}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: isSel ? section.color : "#9CA3AF" }}>
                    {SCORE_LABELS[n]}{isSel && " ✓"}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: isSel ? "#374151" : "#BFBFBF" }}>
                    {opt.text}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Section overview
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}
    >
      <div className="px-4 py-3.5" style={{ backgroundColor: section.color }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
          Ikhtisar Rubrik
        </p>
        <p className="text-sm font-bold text-white">{section.label}</p>
      </div>
      <div className="bg-white divide-y" style={{ borderColor: "#EDF0F5" }}>
        {section.criteria.map((c, ci) => {
          const sc = scores[c.id] ?? null
          return (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                style={{ backgroundColor: sc ? section.color : "#D1D5DB" }}
              >
                {ci + 1}
              </span>
              <p className="flex-1 text-xs font-medium text-gray-700 truncate min-w-0">{c.label}</p>
              {sc
                ? <span className="text-xs font-black shrink-0" style={{ color: section.color }}>{sc}</span>
                : <span className="text-xs shrink-0" style={{ color: "#D1D5DB" }}>—</span>}
            </div>
          )
        })}
      </div>
      <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100">
        <p className="text-[11px] italic" style={{ color: "#9CA3AF" }}>
          Hover pada kriteria untuk detail rubrik
        </p>
      </div>
    </div>
  )
}

// ── Main Export ──────────────────────────────────────────────────
export function EvalForm({
  lembagaSlug, evaluatorId, employeeId, employeeName, employeeRole, employeeDivisi, rubricType, existing,
}: Props) {
  const router = useRouter()
  const sections: Section[] = getSectionsForRubric(rubricType)
  const [step, setStep] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>(existing?.scores ?? {})
  const [catatan, setCatatan] = useState(existing?.catatan ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const isFinalStep = step === sections.length
  const currentSection = isFinalStep ? null : sections[step]
  const totalCriteria = sections.flatMap((s) => s.criteria).length
  const totalFilled = sections.flatMap((s) => s.criteria).filter((c) => scores[c.id]).length
  const totalRaw = Object.values(scores).reduce((a, b) => a + b, 0)
  const max = rubricType === "ae" ? 56 : 80
  const grade = getNewRubricGrade(totalRaw, rubricType)
  const effectiveFocusedId = focusedId ?? (currentSection?.criteria[0]?.id ?? null)

  function setScore(id: string, sc: number) {
    setScores((p) => ({ ...p, [id]: sc }))
    setFocusedId(id)
  }

  function next() {
    if (currentSection) {
      const missing = currentSection.criteria.filter((c) => !scores[c.id])
      if (missing.length > 0) {
        toast.error(`Lengkapi ${missing.length} kriteria di aspek ini`)
        return
      }
    }
    setFocusedId(null)
    setStep((s) => Math.min(s + 1, sections.length))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function prev() {
    setFocusedId(null)
    setStep((s) => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function navigateTo(s: number) {
    setFocusedId(null)
    setStep(s)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function submit() {
    const allIds = sections.flatMap((s) => s.criteria.map((c) => c.id))
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
    <div>
      {/* Mobile progress header */}
      <div
        className="lg:hidden mb-5 rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)",
          boxShadow: "0 4px 16px rgba(15,37,64,0.22)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-white">{isFinalStep ? "Ringkasan" : currentSection?.label}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>{employeeName}</p>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(196,151,42,0.2)", color: "#C4972A" }}
          >
            {step + 1} / {sections.length + 1}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${(step / sections.length) * 100}%`,
              background: "linear-gradient(90deg, #C4972A, #E8B84B)",
              transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
        <div className="flex gap-1 mt-2.5 justify-center">
          {sections.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full"
              style={{
                backgroundColor: i < step ? "#C4972A" : i === step ? "#E8B84B" : "rgba(255,255,255,0.18)",
                width: i === step ? "24px" : "6px",
                transition: "width 0.3s, background-color 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-6 items-start">

        {/* Left: sticky navigation */}
        <aside className="hidden lg:block sticky top-20">
          <LeftSidebar
            sections={sections}
            step={step}
            scores={scores}
            employeeName={employeeName}
            employeeRole={employeeRole}
            employeeDivisi={employeeDivisi}
            rubricType={rubricType}
            totalFilled={totalFilled}
            totalCriteria={totalCriteria}
            onNavigate={navigateTo}
          />
        </aside>

        {/* Center: form content */}
        <div className="min-w-0">
          {/* Section criteria */}
          {currentSection && (
            <div className="card animate-in">
              <div
                className="px-5 py-4 text-white relative overflow-hidden"
                style={{ backgroundColor: currentSection.color }}
              >
                <div className="relative flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-xl tracking-wide">{currentSection.label}</h2>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {currentSection.criteria.length} kriteria penilaian
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
                  >
                    {currentSection.criteria.filter((c) => scores[c.id]).length}/{currentSection.criteria.length} ✓
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {currentSection.criteria.map((c, ci) => (
                  <CriterionCard
                    key={c.id}
                    criterion={c}
                    value={scores[c.id] ?? null}
                    index={ci}
                    sectionColor={currentSection.color}
                    onChange={(sc) => setScore(c.id, sc)}
                    onFocus={() => setFocusedId(c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Final step: summary + catatan */}
          {isFinalStep && (
            <div className="space-y-5 animate-in">
              <div
                className="rounded-2xl p-6 flex flex-col items-center gap-3"
                style={{
                  background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
                  boxShadow: "0 4px 20px rgba(15,37,64,0.25)",
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
                  Skor Akhir
                </p>
                <ScoreRing total={totalRaw} max={max} color={grade.color} size={130} />
                <span
                  className="text-sm font-black px-5 py-1.5 rounded-full"
                  style={{ color: grade.color, backgroundColor: grade.bg }}
                >
                  {grade.label}
                </span>
              </div>

              {/* Mobile recap (desktop shows in right panel) */}
              <div className="lg:hidden card">
                <div className="px-5 py-3.5 border-b" style={{ borderColor: "#DDE3EC" }}>
                  <h3 className="font-bold text-gray-800">Rekap Per Aspek</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {sections.map((s) => {
                    const raw = s.criteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0)
                    const pct = (raw / s.maxScore) * 100
                    return (
                      <div key={s.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-600 truncate">{s.label}</span>
                          <span className="text-xs font-bold shrink-0 ml-1" style={{ color: s.color }}>{raw}/{s.maxScore}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "#DDE3EC" }}>
                    <span className="font-bold text-gray-700">Total</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black" style={{ color: grade.color }}>{totalRaw}<span className="text-sm text-gray-400">/{max}</span></span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ color: grade.color, backgroundColor: grade.bg }}>
                        {grade.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
                    className="w-full px-3.5 py-3 border-2 border-gray-200 rounded-xl text-sm resize-none"
                    style={{ outline: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = "#C4972A")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={step === 0 ? () => router.push(`/${lembagaSlug}/dashboard`) : prev}
              className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold border-2 transition-colors"
              style={{ color: "#6B7280", borderColor: "#E5E7EB" }}
            >
              <ChevronLeft size={16} />
              {step === 0 ? "Dashboard" : "Kembali"}
            </button>

            {isFinalStep ? (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                  color: "#1C1409",
                  boxShadow: "0 3px 14px rgba(196,151,42,0.42)",
                }}
              >
                <Check size={16} />
                {submitting ? "Menyimpan..." : "Simpan Penilaian"}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black"
                style={{
                  background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                  color: "#1C1409",
                  boxShadow: "0 3px 14px rgba(196,151,42,0.42)",
                }}
              >
                Berikutnya <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Right: sticky rubric panel */}
        <aside className="hidden lg:block sticky top-20">
          <RubricPanel
            section={currentSection}
            focusedId={effectiveFocusedId}
            scores={scores}
            sections={sections}
            rubricType={rubricType}
            isFinalStep={isFinalStep}
          />
        </aside>
      </div>
    </div>
  )
}
