"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, ArrowRight, FileText } from "lucide-react"

/**
 * Pintu masuk karyawan untuk melihat rapornya sendiri.
 *
 * Terpisah dari pintu masuk penilai: kode yang sama tidak bisa dipakai untuk
 * keduanya, dan karyawan tidak melihat apa pun selain rapornya sendiri.
 */
export function MasukKaryawan() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) { setError("Masukkan kode akses"); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/karyawan", {
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
      router.refresh()
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-10">
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
            <FileText size={22} color="#0F2540" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(196,151,42,0.9)" }}>
            Rapor Saya
          </p>
          <h1 className="text-xl font-bold text-white">Lihat penilaian Anda</h1>
          <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
            Masukkan kode akses karyawan Anda. Kodenya bisa diminta ke atasan langsung.
          </p>
        </div>

        <form onSubmit={submit} className="px-7 pb-8 flex flex-col gap-3">
          <div className="relative">
            <KeyRound
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "rgba(255,255,255,0.35)" }}
            />
            <input
              id="kode-karyawan"
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null) }}
              placeholder="Kode akses"
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white"
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                border: `1px solid ${error ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.14)"}`,
                outline: "none",
              }}
            />
          </div>

          {error && (
            <p className="text-xs px-1" style={{ color: "#FCA5A5" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
              color: "#1C1409",
            }}
          >
            {submitting ? "Memeriksa…" : "Masuk"}
            {!submitting && <ArrowRight size={15} />}
          </button>
        </form>
      </div>
    </div>
  )
}
