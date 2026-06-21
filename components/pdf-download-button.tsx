"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  teacherId: string
  teacherName: string
}

export function PdfDownloadButton({ teacherId, teacherName }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${teacherId}/pdf`)
      if (!res.ok) {
        toast.error("Gagal membuat laporan PDF. Coba lagi.")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Laporan-${teacherName.replace(/\s+/g, "_")}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Laporan PDF berhasil diunduh")
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        style={{
          border: "1px solid rgba(255,255,255,0.3)",
          color: loading ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.9)",
          cursor: loading ? "not-allowed" : "pointer",
          backgroundColor: loading ? "rgba(255,255,255,0.06)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.10)"
        }}
        onMouseLeave={(e) => {
          if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        {loading ? "Menyiapkan PDF…" : "Unduh Laporan PDF"}
      </button>

      {/* Full-screen overlay while generating */}
      {loading && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
          style={{ backgroundColor: "rgba(28,14,4,0.72)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-2xl px-10 py-8"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
              minWidth: 280,
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)" }}
            >
              <FileDown size={26} style={{ color: "#1C1409" }} />
            </div>
            <div className="text-center">
              <p className="font-black text-base" style={{ color: "#1C1917" }}>
                Menyiapkan Laporan
              </p>
              <p className="text-xs mt-1" style={{ color: "#78716C" }}>
                Sedang membuat PDF untuk
              </p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: "#2C1A08" }}>
                {teacherName}
              </p>
            </div>
            <div className="flex items-center gap-2" style={{ color: "#C4972A" }}>
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs font-medium" style={{ color: "#78716C" }}>
                Mohon tunggu sebentar…
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
