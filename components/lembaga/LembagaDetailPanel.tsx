"use client"

import { Fragment, useState } from "react"
import { X, Save, Loader2, Pencil, RotateCcw, PenLine } from "lucide-react"
import { getSectionsForRubric } from "@/lib/rubrics"
import { toast } from "sonner"
import type { EvaluateeRowData } from "@/lib/lembaga-dashboard-data"
import type { LembagaEditTarget } from "./LembagaEvalModal"
import { LembagaPdfButton } from "./LembagaPdfButton"

const SECTION_NAMES = [
  "Disiplin",
  "Loyalitas",
  "Komitmen",
  "Jujur & Amanah",
  "Persatuan",
  "Leadership",
  "Manajemen Tim",
]

const ROLE_LABEL: Record<string, string> = {
  staff:       "Staff",
  koordinator: "Koordinator",
  supervisor:  "Supervisor",
  ceo:         "CEO",
  pm:          "Project Manager",
  management:  "Management",
  founder:     "General Manager",
  superadmin:  "Super Admin",
}

interface Props {
  e: EvaluateeRowData
  lembagaSlug: string
  sessionEvaluatorId: string
  onClose: () => void
  onEdit: (t: LembagaEditTarget) => void
}

export function LembagaDetailPanel({ e, lembagaSlug, sessionEvaluatorId, onClose, onEdit }: Props) {
  const sections = getSectionsForRubric(e.rubricType)
  const secCount = e.rubricType === "ae" ? 5 : 7

  const totalScore = e.totalScore ?? 0
  const maxScore = e.maxScore
  const pct = maxScore > 0 ? totalScore / maxScore : 0
  const grade = e.grade

  // Catatan Final inline editor
  const initialCatatan = e.finalCatatan ?? ""
  const [value, setValue] = useState(initialCatatan)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedValue, setSavedValue] = useState(initialCatatan)

  function parseSectionCatatan(catatan: string | null): Record<string, string> {
    if (!catatan) return {}
    try {
      const p = JSON.parse(catatan)
      if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, string>
    } catch {}
    return {}
  }

  // Fallback catatan text from evaluators (plain text from JSON values)
  const fallbackCatatan = e.evaluationSummaries
    .filter((s) => s.catatan)
    .map((s) => {
      const parsed = parseSectionCatatan(s.catatan)
      const parts = sections.map((sec) => parsed[sec.id]?.trim()).filter(Boolean)
      return parts.length > 0 ? `${s.evaluatorName}: ${parts.join(" | ")}` : null
    })
    .filter(Boolean)
    .join("\n")

  const displayCatatan = savedValue || fallbackCatatan

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/teachers/${e.id}/catatan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCatatan: value.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setSavedValue(value.trim())
      setEditing(false)
      toast.success("Catatan final disimpan")
    } catch {
      toast.error("Gagal menyimpan catatan")
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setValue(savedValue)
    setEditing(false)
  }

  // SVG ring params
  const R = 30
  const circumference = 2 * Math.PI * R
  const stroke = circumference * (1 - pct)
  const gradeColor = grade?.color ?? "#94A3B8"
  const gradeBg = grade?.bg ?? "#F3F4F6"
  const gradeLabel = grade?.label ?? "Belum"

  return (
    <div
      className="animate-slide"
      style={{
        width: "520px",
        flexShrink: 0,
        position: "sticky",
        top: "80px",
        height: "calc(100vh - 96px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: "0.75rem",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(15,37,64,0.18)",
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          flexShrink: 0,
          padding: "16px",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            backgroundColor: "rgba(255,255,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={13} color="white" />
        </button>

        <p
          style={{
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "rgba(196,151,42,0.85)",
            marginBottom: "4px",
          }}
        >
          Detil Karyawan
        </p>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", paddingRight: "32px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontWeight: 700,
                color: "#FFFFFF",
                fontSize: "14px",
                lineHeight: 1.3,
                marginBottom: "6px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.name}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255,255,255,0.13)",
                  color: "rgba(255,255,255,0.80)",
                  textTransform: "uppercase",
                }}
              >
                {ROLE_LABEL[e.role] ?? e.role}
              </span>
              {e.divisi && (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(196,151,42,0.18)",
                    color: "#E8B84B",
                  }}
                >
                  {e.divisi}
                </span>
              )}
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.60)",
                  textTransform: "uppercase",
                }}
              >
                {e.rubricType === "ae" ? "A–E" : "A–G"}
              </span>
            </div>
          </div>

          {/* Score ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="5" />
              <circle
                cx="32"
                cy="32"
                r={R}
                fill="none"
                stroke={gradeColor}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={stroke}
                strokeLinecap="round"
              />
              <g style={{ transform: "rotate(90deg)", transformOrigin: "32px 32px" }}>
                <text
                  x="32"
                  y="28"
                  textAnchor="middle"
                  fill="white"
                  style={{ fontSize: "11px", fontWeight: 700 }}
                >
                  {maxScore > 0 ? (totalScore * 4 / maxScore).toFixed(1) : "0"}
                </text>
                <text
                  x="32"
                  y="40"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.50)"
                  style={{ fontSize: "9px" }}
                >
                  /4
                </text>
              </g>
            </svg>
            <span
              style={{
                fontSize: "8px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: gradeBg,
                color: gradeColor,
                whiteSpace: "nowrap",
              }}
            >
              {gradeLabel}
            </span>
          </div>
        </div>

        {/* Gold divider */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)",
          }}
        />
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Section: Rekap Per Aspek */}
        <div>
          <p
            style={{
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#94A3B8",
              marginBottom: "10px",
            }}
          >
            Rekap Per Aspek
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sections.map((sec, i) => {
              const raw = e.sectionScores[i]
              const mx = e.sectionMax[i]
              if (raw === null || mx === null) return null
              const barPct = mx > 0 ? Math.round((raw / mx) * 100) : 0
              return (
                <div key={sec.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#374151" }}>
                      <span style={{ color: sec.color, fontWeight: 700, marginRight: "4px" }}>{String.fromCharCode(65 + i)}.</span>
                      {SECTION_NAMES[i]}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: sec.color, tabularNums: true } as React.CSSProperties}>
                      {((raw * 4) / mx).toFixed(1)}<span style={{ fontSize: "8px", fontWeight: 400, color: "#94A3B8" }}>/4</span>
                    </span>
                  </div>
                  <div style={{ height: "5px", borderRadius: "3px", backgroundColor: "#EDF0F5", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${barPct}%`,
                        borderRadius: "3px",
                        backgroundColor: sec.color,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section: Detail Skor Per Kriteria */}
        {e.evaluationSummaries.length > 0 && (
          <div>
            <p
              style={{
                fontSize: "9px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#94A3B8",
                marginBottom: "10px",
              }}
            >
              Detail Skor Per Kriteria
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F1F4F8" }}>
                    <th
                      style={{
                        padding: "4px 8px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "#64748B",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        minWidth: "120px",
                      }}
                    >
                      Kriteria
                    </th>
                    {e.evaluationSummaries.map((sum) => (
                      <th
                        key={sum.evaluatorId}
                        style={{
                          padding: "4px 6px",
                          textAlign: "center",
                          fontWeight: 700,
                          color: "#64748B",
                          fontSize: "9px",
                          maxWidth: "60px",
                        }}
                      >
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "#0F2540",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "7px",
                            fontWeight: 700,
                            margin: "0 auto",
                          }}
                          title={sum.evaluatorName}
                        >
                          {sum.evaluatorName.charAt(0).toUpperCase()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sections.map((sec, secIdx) => (
                    <Fragment key={sec.id}>
                      {/* Section header row */}
                      <tr style={{ backgroundColor: sec.lightBg }}>
                        <td
                          colSpan={e.evaluationSummaries.length + 1}
                          style={{
                            padding: "3px 8px",
                            fontSize: "8px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: sec.textColor,
                          }}
                        >
                          {sec.icon} {sec.label}
                        </td>
                      </tr>
                      {/* Criteria rows */}
                      {sec.criteria.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid #F1F4F8" }}>
                          <td
                            style={{
                              padding: "5px 8px",
                              color: "#475569",
                              fontSize: "10px",
                              lineHeight: 1.4,
                            }}
                          >
                            {c.label}
                          </td>
                          {e.evaluationSummaries.map((sum) => {
                            const score = sum.scores[c.id] ?? null
                            const scoreColor =
                              score === 4 ? "#065F46"
                              : score === 3 ? "#1E3A8A"
                              : score === 2 ? "#92400E"
                              : score === 1 ? "#991B1B"
                              : "#CBD5E1"
                            const scoreBg =
                              score === 4 ? "#BBF7D0"
                              : score === 3 ? "#BFDBFE"
                              : score === 2 ? "#FDE68A"
                              : score === 1 ? "#FECACA"
                              : "#F1F4F8"
                            return (
                              <td key={sum.evaluatorId} style={{ padding: "5px 6px", textAlign: "center" }}>
                                {score !== null ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: "18px",
                                      height: "18px",
                                      borderRadius: "50%",
                                      backgroundColor: scoreBg,
                                      color: scoreColor,
                                      fontSize: "9px",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {score}
                                  </span>
                                ) : (
                                  <span style={{ color: "#CBD5E1", fontSize: "9px" }}>—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section: Catatan Penilai */}
        {e.evaluationSummaries.some((s) => s.catatan) && (
          <div>
            <p
              style={{
                fontSize: "9px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#94A3B8",
                marginBottom: "8px",
              }}
            >
              Catatan Penilai
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {e.evaluationSummaries.filter((s) => s.catatan).map((s) => {
                const parsed = parseSectionCatatan(s.catatan)
                const entries = sections
                  .map((sec) => ({ sec, text: parsed[sec.id]?.trim() }))
                  .filter((x) => x.text)
                if (entries.length === 0) return null
                return (
                  <div
                    key={s.evaluatorId}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748B", marginBottom: "6px" }}>
                      {s.evaluatorName}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {entries.map(({ sec, text }) => (
                        <div key={sec.id}>
                          <p style={{ fontSize: "8px", fontWeight: 700, color: sec.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1px" }}>
                            {sec.label}
                          </p>
                          <p style={{ fontSize: "11px", color: "#475569", lineHeight: 1.5 }}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Section: Catatan Final */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <p
              style={{
                fontSize: "9px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#94A3B8",
              }}
            >
              Catatan Final
            </p>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "9px",
                  fontWeight: 600,
                  color: "#1E3A5F",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "#EDF2F7",
                }}
              >
                <Pencil size={9} /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <div>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={4}
                placeholder="Tulis catatan final untuk karyawan ini…"
                style={{
                  width: "100%",
                  fontSize: "11px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #1E3A5F",
                  backgroundColor: "#F8FAFC",
                  color: "#374151",
                  lineHeight: 1.6,
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: "6px", marginTop: "6px", justifyContent: "flex-end" }}>
                <button
                  onClick={handleCancel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#64748B",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#F1F5F9",
                  }}
                >
                  <RotateCcw size={10} /> Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, #1E3A5F, #2A4F7A)",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                  Simpan
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "10px",
                borderRadius: "8px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                minHeight: "52px",
              }}
            >
              {displayCatatan ? (
                <p style={{ fontSize: "11px", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {displayCatatan}
                </p>
              ) : (
                <p style={{ fontSize: "11px", color: "#CBD5E1", fontStyle: "italic" }}>
                  Belum ada catatan final.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          borderTop: "1px solid #E2E8F0",
          backgroundColor: "#F8FAFC",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() =>
              onEdit({
                employeeId: e.id,
                employeeName: e.name,
                evaluatorId: sessionEvaluatorId,
                evaluatorName: "Saya",
                rubricType: e.rubricType,
              })
            }
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 700,
              background: "linear-gradient(135deg, #C4972A, #E8B84B)",
              color: "#1C1409",
            }}
          >
            <PenLine size={11} /> Input Penilaian
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor: "#E2E8F0",
              color: "#374151",
            }}
          >
            Tutup
          </button>
        </div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LembagaPdfButton
            employeeId={e.id}
            employeeName={e.name}
            lembagaSlug={lembagaSlug}
          />
        </div>
      </div>
    </div>
  )
}
