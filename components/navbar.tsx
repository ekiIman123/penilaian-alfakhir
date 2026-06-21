"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, ClipboardPen, Database } from "lucide-react"

export function Navbar() {
  const path = usePathname()
  return (
    <nav
      className="sticky top-0 z-50 text-white"
      style={{
        backgroundColor: "#2C1A08",
        boxShadow: "0 2px 0 #C4972A, 0 4px 20px rgba(44,26,8,0.45)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Monogram with gold ring */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
            style={{
              background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
              color: "#1C1409",
              boxShadow: "0 0 0 2px #2C1A08, 0 0 0 3.5px #C4972A, 0 0 12px rgba(196,151,42,0.35)",
            }}
          >
            AF
          </div>
          <div className="leading-tight">
            <div
              className="font-bold text-sm tracking-wide"
              style={{ color: "rgba(196,151,42,0.92)" }}
            >
              Al Fakhir
            </div>
            <div className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.48)" }}>
              Performance Appraisal 2025/2026
            </div>
          </div>
        </Link>

        {/* Nav links — pill group */}
        <div
          className="flex items-center gap-0.5 rounded-xl p-1"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
        >
          {/* Dashboard */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors relative"
            style={{
              color: path === "/" ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.65)",
              backgroundColor: path === "/" ? "rgba(196,151,42,0.15)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (path !== "/") (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"
            }}
            onMouseLeave={(e) => {
              if (path !== "/") (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
            }}
          >
            <BarChart3 size={15} />
            Dashboard
          </Link>

          {/* + Nilai */}
          <Link
            href="/form"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            style={{
              background: path.startsWith("/form")
                ? "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)"
                : "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
              color: "#1C1409",
              boxShadow: "0 2px 8px rgba(196,151,42,0.40)",
            }}
          >
            <ClipboardPen size={15} />
            + Nilai
          </Link>

          {/* Kelola Data */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: path.startsWith("/admin") ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.65)",
              backgroundColor: path.startsWith("/admin") ? "rgba(196,151,42,0.15)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!path.startsWith("/admin")) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"
            }}
            onMouseLeave={(e) => {
              if (!path.startsWith("/admin")) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
            }}
          >
            <Database size={15} />
            Kelola Data
          </Link>
        </div>
      </div>
    </nav>
  )
}
