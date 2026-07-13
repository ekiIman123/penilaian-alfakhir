"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, ArrowRight } from "lucide-react"

interface Props {
  lembagaSlug: "iysa" | "icgi" | "iyora"
  lembagaLabel: string
  lembagaTagline?: string
}

export function CodeEntryForm({ lembagaSlug, lembagaLabel, lembagaTagline }: Props) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) {
      setError("Masukkan kode akses")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/lembaga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Kode akses tidak valid")
        setSubmitting(false)
        return
      }
      if (data.session?.lembaga && data.session.lembaga !== lembagaSlug) {
        setError(`Kode ini untuk lembaga ${String(data.session.lembaga).toUpperCase()}, bukan ${lembagaLabel}`)
        setSubmitting(false)
        return
      }
      router.push(`/${lembagaSlug}/dashboard`)
      router.refresh()
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 12px 40px rgba(15,37,64,0.35)",
        }}
      >
        <div className="px-7 py-8 text-center">
          <div
            className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
              boxShadow: "0 4px 14px rgba(196,151,42,0.35)",
            }}
          >
            <KeyRound size={22} color="#0F2540" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.9)" }}>
            {lembagaLabel}
          </p>
          <h1 className="text-2xl font-bold text-white leading-tight">Masuk Penilai</h1>
          {lembagaTagline && (
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
              {lembagaTagline}
            </p>
          )}
        </div>

        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />

        <form onSubmit={submit} className="bg-white px-7 py-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kode Akses <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null) }}
              placeholder="Masukkan kode akses"
              autoFocus
              className="w-full px-4 py-3 border-2 rounded-xl text-sm font-mono tracking-wider uppercase transition-colors"
              style={{
                borderColor: error ? "#DC2626" : code ? "#C4972A" : "#E5E7EB",
                outline: "none",
              }}
              onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "#C4972A" }}
              onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = code ? "#C4972A" : "#E5E7EB" }}
            />
            {error && <p className="text-xs mt-2 font-medium" style={{ color: "#DC2626" }}>{error}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-black disabled:opacity-60 transition-transform active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
              color: "#1C1409",
              boxShadow: "0 4px 14px rgba(196,151,42,0.35)",
            }}
          >
            {submitting ? "Memverifikasi..." : "Masuk"}
            {!submitting && <ArrowRight size={16} />}
          </button>

          <p className="text-[11px] text-center pt-1" style={{ color: "#9CA3AF" }}>
            Hubungi admin jika Anda belum memiliki kode akses.
          </p>
        </form>
      </div>
    </div>
  )
}
