"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { FileDown, Loader2, ChevronDown, Archive } from "lucide-react"
import { toast } from "sonner"

// ─── Single employee PDF button ───────────────────────────────────────────────

interface SingleProps {
  employeeId: string
  employeeName: string
  lembagaSlug: string
}

export function LembagaPdfButton({ employeeId, employeeName, lembagaSlug }: SingleProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/lembaga/${lembagaSlug}/reports/${employeeId}/pdf`)
      if (!res.ok) {
        toast.error("Gagal membuat laporan PDF. Coba lagi.")
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `Rapor-${employeeName.replace(/\s+/g, "_")}.pdf`
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
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: 700,
          backgroundColor: loading ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)",
          color: loading ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.90)",
          border: "1px solid rgba(255,255,255,0.20)",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.18)"
        }}
        onMouseLeave={(e) => {
          if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.10)"
        }}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
        {loading ? "Menyiapkan…" : "Unduh Rapor"}
      </button>

      {loading && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(15,37,64,0.65)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-xl px-10 py-8"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 16px 48px rgba(0,0,0,0.20)", minWidth: 280 }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1E3A5F" }}
            >
              <FileDown size={26} style={{ color: "#C4972A" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-base" style={{ color: "#1A2233" }}>Menyiapkan Laporan</p>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>Sedang membuat PDF untuk</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#1E3A5F" }}>{employeeName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: "#C4972A" }} />
              <span className="text-xs font-medium" style={{ color: "#64748B" }}>Mohon tunggu sebentar…</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Bulk PDF download button (with dropdown for format & role) ───────────────

interface BulkProps {
  lembagaSlug: string
  lembagaLabel: string
}

export function LembagaBulkPdfButton({ lembagaSlug, lembagaLabel }: BulkProps) {
  const [loading, setLoading]     = useState(false)
  const [loadingLabel, setLoadingLabel] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [dropdownOpen])

  async function handleDownload(format: "pdf" | "zip", role: "all" | "staff" | "non-staff") {
    if (loading) return
    setDropdownOpen(false)
    const roleLabel = role === "all" ? "semua" : role === "staff" ? "staf" : "non staf"
    const formatLabel = format === "pdf" ? "PDF gabungan" : "ZIP"
    setLoadingLabel(`${formatLabel} — ${roleLabel}`)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/lembaga/${lembagaSlug}/reports/bulk?format=${format}&role=${role}`,
      )
      if (!res.ok) {
        toast.error("Gagal membuat laporan. Coba lagi.")
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      const year = new Date().getFullYear()
      a.download = format === "zip"
        ? `rapor-${lembagaSlug}-${role}-${year}.zip`
        : `rapor-${lembagaSlug}-${role}-${year}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`Laporan ${formatLabel} berhasil diunduh`)
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setLoading(false)
      setLoadingLabel("")
    }
  }

  return (
    <>
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => !loading && setDropdownOpen((o) => !o)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: loading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.12)",
            color: loading ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.90)",
            border: "1px solid rgba(255,255,255,0.20)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
          <span>Unduh Rapor Massal</span>
          {!loading && <ChevronDown size={11} style={{ opacity: 0.6, transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />}
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 z-30 rounded-lg py-1.5"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #DDE3EC", minWidth: "200px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          >
            <p className="px-3 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
              Format PDF Gabungan
            </p>
            {(["all", "non-staff", "staff"] as const).map((role) => {
              const label = role === "all" ? "Semua Karyawan" : role === "staff" ? "Staf Saja" : "Non-Staf Saja"
              return (
                <button
                  key={role}
                  onClick={() => handleDownload("pdf", role)}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-2"
                  style={{ color: "#374151" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <FileDown size={12} style={{ color: "#1E3A5F", flexShrink: 0 }} />
                  {label}
                </button>
              )
            })}

            <div style={{ height: "1px", backgroundColor: "#E2E8F0", margin: "6px 0" }} />
            <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
              Format ZIP (Terpisah)
            </p>
            {(["all", "non-staff", "staff"] as const).map((role) => {
              const label = role === "all" ? "Semua Karyawan" : role === "staff" ? "Staf Saja" : "Non-Staf Saja"
              return (
                <button
                  key={role}
                  onClick={() => handleDownload("zip", role)}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-2"
                  style={{ color: "#374151" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <Archive size={12} style={{ color: "#059669", flexShrink: 0 }} />
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {loading && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(15,37,64,0.65)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-xl px-10 py-8"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 16px 48px rgba(0,0,0,0.20)", minWidth: 300 }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1E3A5F" }}
            >
              <FileDown size={26} style={{ color: "#C4972A" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-base" style={{ color: "#1A2233" }}>Menyiapkan Laporan Massal</p>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>{lembagaLabel} · {loadingLabel}</p>
              <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Proses ini memerlukan beberapa saat…</p>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: "#C4972A" }} />
              <span className="text-xs font-medium" style={{ color: "#64748B" }}>Mohon tunggu sebentar…</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
