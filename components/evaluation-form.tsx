"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SECTIONS, getAllCriteriaIds, getScoreGrade, type Criterion, type Section } from "@/lib/rubrics"
import { calcTotal, calcSectionRaw } from "@/lib/calculations"
import { ChevronRight, ChevronLeft, Check } from "lucide-react"

interface Props {
  evaluators: { id: string; name: string }[]
  teachers: { id: string; name: string }[]
  prefillEvaluatorId?: string
  prefillTeacherId?: string
  existingEvaluation?: { scores: Record<string, number>; catatan: string | null } | null
}

const SCORE_LABELS: Record<number, string> = { 1: "Kurang", 2: "Cukup", 3: "Baik", 4: "Sangat Baik" }

type StepMeta = { label: string; icon: string; section?: Section }
const STEP_META: StepMeta[] = [
  { label: "Identitas", icon: "👤" },
  ...SECTIONS.map((s) => ({ label: s.label, icon: s.icon, section: s })),
  { label: "Selesai", icon: "✅" },
]

// ── Score Ring SVG ──────────────────────────────────────────────────
function ScoreRing({ total, color, size = 100 }: { total: number; color: string; size?: number }) {
  const r = size * 0.41
  const circ = 2 * Math.PI * r
  const cx = size / 2
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block mx-auto">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E7EB" strokeWidth={size * 0.09} />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none" stroke={color}
        strokeWidth={size * 0.09}
        strokeDasharray={circ}
        strokeDashoffset={circ - (total / 4) * circ}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text x={cx} y={cx - size * 0.04} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.2} fontWeight="900" fill={color}>{total.toFixed(2)}</text>
      <text x={cx} y={cx + size * 0.16} textAnchor="middle"
        fontSize={size * 0.09} fill="#9CA3AF">/ 4.00</text>
    </svg>
  )
}

// ── Criterion Card (center column) ──────────────────────────────────
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
              className="flex-1 h-12 flex flex-col items-center justify-center rounded-xl border-2 transition-colors focus:outline-none"
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

      {/* Mobile rubric — always visible, right panel handles desktop */}
      <div className="lg:hidden mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${sectionColor}20` }}>
        {([4, 3, 2, 1] as const).map((n, ni) => {
          const opt = criterion.options.find((o) => o.score === n)
          if (!opt) return null
          const isSelected = value === n
          return (
            <div
              key={n}
              className="flex gap-2.5 px-3 py-2"
              style={{
                backgroundColor: isSelected ? `${sectionColor}0E` : ni % 2 === 0 ? "#FAFAFA" : "white",
                borderBottom: ni < 3 ? `1px solid ${sectionColor}10` : "none",
                borderLeft: isSelected ? `3px solid ${sectionColor}` : "3px solid transparent",
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                style={{
                  backgroundColor: isSelected ? sectionColor : "#E5E7EB",
                  color: isSelected ? "white" : "#9CA3AF",
                }}
              >
                {n}
              </div>
              <p className="text-xs leading-relaxed flex-1" style={{ color: isSelected ? "#374151" : "#9CA3AF" }}>
                <span className="font-semibold mr-1" style={{ color: isSelected ? sectionColor : "#B0AEAD" }}>
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

// ── Right Rubric Panel ───────────────────────────────────────────────
function RubricPanel({
  section, focusedId, scores, isFinalStep,
}: {
  section: Section | null
  focusedId: string | null
  scores: Record<string, number>
  isFinalStep: boolean
}) {
  if (isFinalStep) {
    const total = calcTotal(scores)
    const grade = getScoreGrade(total)
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
            Rekap Nilai Per Aspek
          </p>
        </div>
        <div className="bg-white p-4 space-y-3">
          {SECTIONS.map((s) => {
            const raw = calcSectionRaw(scores, s.id)
            const norm = raw * 4 / s.maxScore
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600">{s.label.split(" ")[0]}</span>
                  <span className="text-xs font-bold" style={{ color: s.color }}>{norm.toFixed(2)}/4</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: `${(norm / 4) * 100}%`, backgroundColor: s.color }} />
                </div>
              </div>
            )
          })}
          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "#DDE3EC" }}>
            <span className="text-sm font-bold text-gray-700">Total</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black" style={{ color: grade.color }}>{total.toFixed(2)}</span>
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
        <p className="text-xs mt-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          Rata-rata dari 25 kriteria menjadi skor akhir dalam skala 1.00–4.00.
        </p>
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
            const isSelected = sel === n
            return (
              <div
                key={n}
                className="flex gap-3 px-4 py-3"
                style={{
                  backgroundColor: isSelected ? `${section.color}0D` : "transparent",
                  borderLeft: isSelected ? `3px solid ${section.color}` : "3px solid transparent",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{
                    backgroundColor: isSelected ? section.color : "#F3F4F6",
                    color: isSelected ? "white" : "#9CA3AF",
                  }}
                >
                  {n}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: isSelected ? section.color : "#9CA3AF" }}>
                    {SCORE_LABELS[n]}{isSelected && " ✓"}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: isSelected ? "#374151" : "#BFBFBF" }}>
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

  // Section overview when nothing is focused
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}
    >
      <div className="px-4 py-3.5" style={{ backgroundColor: section.color }}>
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
              Ikhtisar Rubrik
            </p>
            <p className="text-sm font-bold text-white">{section.label}</p>
          </div>
        </div>
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
              {sc ? (
                <span className="text-xs font-black shrink-0" style={{ color: section.color }}>{sc}</span>
              ) : (
                <span className="text-xs shrink-0" style={{ color: "#D1D5DB" }}>—</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100">
        <p className="text-[11px] italic" style={{ color: "#9CA3AF" }}>
          Hover pada kriteria untuk melihat detail rubrik
        </p>
      </div>
    </div>
  )
}

// ── Left Sidebar ────────────────────────────────────────────────────
function LeftSidebar({
  step, scores, evaluators, teachers, evaluatorId, teacherId, onNavigate,
}: {
  step: number
  scores: Record<string, number>
  evaluators: { id: string; name: string }[]
  teachers: { id: string; name: string }[]
  evaluatorId: string
  teacherId: string
  onNavigate: (s: number) => void
}) {
  const filledCount = Object.keys(scores).length
  const total = calcTotal(scores)
  const grade = getScoreGrade(total)
  const evalName = evaluators.find((e) => e.id === evaluatorId)?.name
  const teachName = teachers.find((t) => t.id === teacherId)?.name

  return (
    <div className="flex flex-col gap-4">
      {(evalName || teachName) && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)",
            boxShadow: "0 4px 16px rgba(15,37,64,0.22)",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.75)" }}>
            Sesi Aktif
          </p>
          {evalName && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Penilai</p>
              <p className="text-xs font-bold text-white leading-snug">{evalName}</p>
            </div>
          )}
          {teachName && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Guru Dinilai</p>
              <p className="text-xs font-bold text-white leading-snug">{teachName}</p>
            </div>
          )}
        </div>
      )}

      {/* Step navigation */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}
      >
        <div
          className="px-4 py-2.5"
          style={{ background: "linear-gradient(135deg, #0F2540, #1E3A5F)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
            Langkah {step + 1} / {STEP_META.length}
          </p>
        </div>
        <div className="bg-white divide-y divide-gray-50">
          {STEP_META.map((meta, i) => {
            const sectionData = meta.section ?? null
            const isDone = i < step
            const isCurrent = i === step
            const canClick = i <= step
            const filledInSection = sectionData
              ? sectionData.criteria.filter((c) => scores[c.id]).length
              : 0
            const sectionDone = sectionData
              ? filledInSection === sectionData.criteria.length
              : false

            return (
              <button
                key={i}
                type="button"
                onClick={() => canClick && onNavigate(i)}
                disabled={!canClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left disabled:cursor-default"
                style={{
                  backgroundColor: isCurrent
                    ? `${sectionData?.color ?? "#C4972A"}10`
                    : "transparent",
                  borderLeft: isCurrent
                    ? `3px solid ${sectionData?.color ?? "#C4972A"}`
                    : "3px solid transparent",
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
                    backgroundColor: isDone && sectionDone
                      ? "#DCFCE7"
                      : isDone && !sectionData
                      ? "#F0FDF4"
                      : isCurrent
                      ? `${sectionData?.color ?? "#C4972A"}18`
                      : "#F9FAFB",
                    border: isCurrent
                      ? `2px solid ${sectionData?.color ?? "#C4972A"}`
                      : isDone ? "2px solid #BBF7D0" : "2px solid transparent",
                  }}
                >
                  {isDone && (sectionDone || !sectionData)
                    ? <Check size={11} color="#15803D" />
                    : <span className="text-xs">{meta.icon}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold truncate leading-tight"
                    style={{
                      color: isCurrent
                        ? (sectionData?.color ?? "#C4972A")
                        : isDone ? "#374151" : "#9CA3AF",
                    }}
                  >
                    {meta.label}
                  </p>
                  {sectionData && (
                    <p className="text-[10px]" style={{ color: sectionDone ? "#15803D" : "#9CA3AF" }}>
                      {filledInSection}/{sectionData.criteria.length}{sectionDone ? " ✓" : ""}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Live score */}
      {filledCount > 0 && (
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
          <ScoreRing total={total} color={grade.color} size={88} />
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ color: grade.color, backgroundColor: grade.bg }}
          >
            {grade.label}
          </span>
          <p className="text-[10px] text-center" style={{ color: "#9CA3AF" }}>
            {filledCount} / 25 kriteria terisi
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Export ──────────────────────────────────────────────────────
export function EvaluationForm({
  evaluators, teachers, prefillEvaluatorId, prefillTeacherId, existingEvaluation,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [evaluatorId, setEvaluatorId] = useState(prefillEvaluatorId ?? "")
  const [teacherId, setTeacherId] = useState(prefillTeacherId ?? "")
  const [scores, setScores] = useState<Record<string, number>>(existingEvaluation?.scores ?? {})
  const [catatan, setCatatan] = useState(existingEvaluation?.catatan ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const totalSteps = STEP_META.length
  const currentSection = step >= 1 && step <= SECTIONS.length ? SECTIONS[step - 1] : null
  const isFinalStep = step === totalSteps - 1
  const total = calcTotal(scores)
  const grade = getScoreGrade(total)
  // Right panel defaults to first criterion of the current section — no hover required
  const effectiveFocusedId = focusedId ?? (currentSection?.criteria[0]?.id ?? null)

  // Auto-load existing evaluation when evaluator + teacher selection changes
  useEffect(() => {
    if (!evaluatorId || !teacherId) return
    // Skip if already hydrated from server-side props for this exact pair
    if (evaluatorId === prefillEvaluatorId && teacherId === prefillTeacherId && existingEvaluation != null) return

    fetch(`/api/evaluations?evaluatorId=${evaluatorId}&teacherId=${teacherId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { scores: Record<string, number>; catatan: string | null } | null) => {
        if (data?.scores) {
          setScores(data.scores)
          setCatatan(data.catatan ?? "")
          toast.info("Data penilaian sebelumnya ditemukan dan dimuat")
        } else {
          setScores({})
          setCatatan("")
        }
      })
      .catch(() => {})
  // prefillEvaluatorId / prefillTeacherId / existingEvaluation are stable props — intentionally omitted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluatorId, teacherId])

  function setScore(id: string, sc: number) {
    setScores((p) => ({ ...p, [id]: sc }))
    setFocusedId(id)
  }

  function validate(): boolean {
    if (step === 0) {
      if (!evaluatorId) { toast.error("Pilih nama penilai"); return false }
      if (!teacherId) { toast.error("Pilih guru yang dinilai"); return false }
      return true
    }
    if (currentSection) {
      const missing = currentSection.criteria.filter((c) => !scores[c.id])
      if (missing.length > 0) {
        toast.error(`Lengkapi penilaian: ${missing.map((c) => c.label).join(", ")}`)
        return false
      }
    }
    return true
  }

  function next() {
    if (!validate()) return
    setFocusedId(null)
    setStep((s) => Math.min(s + 1, totalSteps - 1))
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
    const allIds = getAllCriteriaIds()
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
        body: JSON.stringify({ evaluatorId, teacherId, scores, catatan }),
      })
      if (!res.ok) throw new Error()
      toast.success("Penilaian berhasil disimpan!")
      router.push(`/teachers/${teacherId}`)
      router.refresh()
    } catch {
      toast.error("Gagal menyimpan penilaian. Coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Mobile: progress header */}
      <div
        className="lg:hidden mb-5 rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)",
          boxShadow: "0 4px 16px rgba(15,37,64,0.22)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white">{STEP_META[step]?.label}</p>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(196,151,42,0.2)", color: "#C4972A" }}
          >
            {step + 1} / {totalSteps}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${(step / (totalSteps - 1)) * 100}%`,
              background: "linear-gradient(90deg, #C4972A, #E8B84B)",
              transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
        <div className="flex gap-1 mt-2.5 justify-center">
          {STEP_META.map((_, i) => (
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
            step={step}
            scores={scores}
            evaluators={evaluators}
            teachers={teachers}
            evaluatorId={evaluatorId}
            teacherId={teacherId}
            onNavigate={navigateTo}
          />
        </aside>

        {/* Center: form */}
        <div className="min-w-0">
          {/* Step 0: Identitas */}
          {step === 0 && (
            <div className="card animate-in">
              <div
                className="px-5 py-5 text-white"
                style={{ background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)" }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-bold text-xl">Identitas Penilaian</h2>
                </div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Pilih penilai dan guru yang akan dinilai untuk memulai.
                </p>
              </div>
              <div className="p-5 space-y-5">
                <div
                  className="flex items-center gap-2 text-xs font-medium px-3.5 py-2.5 rounded-xl"
                  style={{ backgroundColor: "#F0F4F9", color: "#1E3A5F", border: "1px solid #DDE3EC" }}
                >
                  <span style={{ color: "#C4972A", fontSize: "1rem" }}>ⓘ</span>
                  Skala penilaian: <strong>1</strong> (Kurang) &nbsp;—&nbsp; <strong>4</strong> (Sangat Baik)
                </div>
                {[
                  { label: "Nama Penilai", val: evaluatorId, set: setEvaluatorId, opts: evaluators, ph: "— Pilih Penilai —" },
                  { label: "Guru yang Dinilai", val: teacherId, set: setTeacherId, opts: teachers, ph: "— Pilih Guru —" },
                ].map(({ label, val, set, opts, ph }) => (
                  <div key={label}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {label} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className="w-full px-3.5 py-3 border-2 border-gray-200 rounded-xl text-sm transition-colors appearance-none bg-white"
                      style={{ outline: "none" }}
                      onFocus={(e) => (e.target.style.borderColor = "#C4972A")}
                      onBlur={(e) => (e.target.style.borderColor = val ? "#C4972A" : "#E5E7EB")}
                    >
                      <option value="">{ph}</option>
                      {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                ))}
                {existingEvaluation && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                    ℹ️ Data penilaian sebelumnya ditemukan dan sudah dimuat untuk diedit.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Steps 1–5: Sections */}
          {currentSection && (
            <div className="card animate-in">
              <div
                className="px-5 py-4 text-white relative overflow-hidden"
                style={{ backgroundColor: currentSection.color }}
              >
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-bold text-xl tracking-wide">{currentSection.label}</h2>
                    </div>
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
                <ScoreRing total={total} color={grade.color} size={130} />
                <span
                  className="text-sm font-black px-5 py-1.5 rounded-full"
                  style={{ color: grade.color, backgroundColor: grade.bg }}
                >
                  {grade.label}
                </span>
              </div>

              <div className="card">
                <div className="px-5 py-3.5 border-b" style={{ borderColor: "#DDE3EC" }}>
                  <h3 className="font-bold text-gray-800">Rekapitulasi Per Aspek</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {SECTIONS.map((s) => {
                    const raw = calcSectionRaw(scores, s.id)
                    const norm = raw * 4 / s.maxScore
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0 mx-2" style={{ backgroundColor: s.color }} />
                        <span className="text-sm font-medium text-gray-600 w-28 shrink-0 truncate">
                          {s.label.split(" ")[0]}
                        </span>
                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(norm / 4) * 100}%`, backgroundColor: s.color, transition: "width 0.7s" }}
                          />
                        </div>
                        <span className="text-sm font-black tabular-nums w-16 text-right shrink-0" style={{ color: s.color }}>
                          {norm.toFixed(2)}/4
                        </span>
                      </div>
                    )
                  })}
                  <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "#DDE3EC" }}>
                    <span className="font-bold text-gray-700">Rata-rata</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black" style={{ color: grade.color }}>{total.toFixed(2)}</span>
                      <span className="text-gray-400">/4.00</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="px-5 py-3.5 border-b" style={{ borderColor: "#DDE3EC" }}>
                  <h3 className="font-bold text-gray-800">Catatan Khusus</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Opsional — catatan untuk guru ini</p>
                </div>
                <div className="p-5">
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    rows={4}
                    placeholder="Tuliskan kesimpulan dan catatan khusus jika diperlukan..."
                    className="w-full px-3.5 py-3 border-2 border-gray-200 rounded-xl text-sm resize-none transition-colors"
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
              onClick={prev}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: "#6B7280", borderColor: "#E5E7EB" }}
            >
              <ChevronLeft size={16} /> Kembali
            </button>

            {isFinalStep ? (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black text-white disabled:opacity-60"
                style={{
                  backgroundColor: "#1E3A5F",
                  boxShadow: "0 3px 12px rgba(15,37,64,0.30)",
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
            isFinalStep={isFinalStep}
          />
        </aside>
      </div>
    </div>
  )
}
