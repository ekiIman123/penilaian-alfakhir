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
          style={{ backgroundColor: "rgba(15,37,64,0.65)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-xl px-10 py-8"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 16px 48px rgba(0,0,0,0.20)",
              minWidth: 280,
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1E3A5F" }}
            >
              <FileDown size={26} style={{ color: "#C4972A" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-base" style={{ color: "#1A2233" }}>
                Menyiapkan Laporan
              </p>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                Sedang membuat PDF untuk
              </p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#1E3A5F" }}>
                {teacherName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: "#C4972A" }} />
              <span className="text-xs font-medium" style={{ color: "#64748B" }}>
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
