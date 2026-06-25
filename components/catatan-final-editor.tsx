"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Save, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface Props {
  teacherId: string
  savedValue: string | null
  fallbackValue: string
}

export function CatatanFinalEditor({ teacherId, savedValue, fallbackValue }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(savedValue ?? "")
  const [saving, setSaving] = useState(false)

  const displayText = savedValue || fallbackValue

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/teachers/${teacherId}/catatan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCatatan: draft.trim() || null }),
      })
      if (!res.ok) throw new Error()
      toast.success("Catatan final berhasil disimpan")
      setEditing(false)
      router.refresh()
    } catch {
      toast.error("Gagal menyimpan catatan")
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(savedValue ?? "")
    setEditing(false)
  }

  return (
    <div className="card">
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between gap-3"
        style={{ borderBottom: "1px solid #DDE3EC" }}
      >
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">Catatan Final</h2>
          <p className="text-xs text-slate-400 mt-0.5">Digunakan pada hasil cetak PDF</p>
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(savedValue ?? fallbackValue); setEditing(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
            style={{ backgroundColor: "#EDF0F5", color: "#374151" }}
          >
            <Pencil size={11} />
            Edit
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              placeholder="Tulis catatan final…"
              className="w-full text-sm rounded-lg px-3 py-2.5 resize-none outline-none"
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #1E3A5F",
                color: "#374151",
                lineHeight: "1.7",
              }}
            />
            <div className="flex items-center justify-between gap-2">
              {fallbackValue && (
                <button
                  onClick={() => setDraft(fallbackValue)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: "#94A3B8" }}
                >
                  <RotateCcw size={10} />
                  Reset ke catatan penilai
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={cancel}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-slate-100"
                  style={{ color: "#64748B" }}
                >
                  Batal
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: "#1E3A5F" }}
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p
            className="text-sm leading-relaxed"
            style={{
              color: displayText ? "#374151" : "#CBD5E1",
              fontStyle: displayText ? "normal" : "italic",
            }}
          >
            {displayText || "Belum ada catatan"}
          </p>
        )}
      </div>

      {savedValue && (
        <div
          className="px-5 py-2 flex items-center gap-1.5"
          style={{ borderTop: "1px solid #EDF0F5" }}
        >
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#16A34A" }} />
          <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>
            Telah diedit &amp; disimpan manual
          </span>
        </div>
      )}
    </div>
  )
}
