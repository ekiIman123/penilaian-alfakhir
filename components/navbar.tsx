"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, ClipboardPen, Database, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"

const NAV_ITEMS = [
  { href: "/",      label: "Dashboard",   icon: BarChart3,    exact: true,  accent: false },
  { href: "/form",  label: "+ Nilai",     icon: ClipboardPen, exact: false, accent: true  },
  { href: "/admin", label: "Kelola Data", icon: Database,     exact: false, accent: false },
] as const

function active(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

export function Navbar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [path])

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
        <Link href="/" className="flex items-center gap-3">
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
            <div className="font-bold text-sm tracking-wide" style={{ color: "rgba(196,151,42,0.92)" }}>
              Al Fakhir
            </div>
            <div
              className="text-[10px] tracking-widest uppercase hidden sm:block"
              style={{ color: "rgba(255,255,255,0.48)" }}
            >
              Performance Appraisal
            </div>
          </div>
        </Link>

        {/* ── Desktop nav pill group ── */}
        <div
          className="hidden md:flex items-center gap-0.5 rounded-xl p-1"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = active(path, item.href, item.exact)
            const Icon = item.icon

            if (item.accent) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
                  style={{
                    background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                    color: "#1C1409",
                    boxShadow: "0 2px 8px rgba(196,151,42,0.40)",
                  }}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.65)",
                  backgroundColor: isActive ? "rgba(196,151,42,0.15)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
                }}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* ── Mobile hamburger button ── */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
          style={{
            color: "rgba(255,255,255,0.80)",
            backgroundColor: open ? "rgba(196,151,42,0.15)" : "transparent",
            border: "1px solid",
            borderColor: open ? "rgba(196,151,42,0.35)" : "transparent",
          }}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      {open && (
        <div
          className="md:hidden"
          style={{
            backgroundColor: "#1C0E04",
            borderTop: "1px solid rgba(196,151,42,0.20)",
            borderBottom: "1px solid rgba(196,151,42,0.10)",
          }}
        >
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = active(path, item.href, item.exact)
              const Icon = item.icon

              if (item.accent) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                      color: "#1C1409",
                      boxShadow: "0 2px 10px rgba(196,151,42,0.35)",
                    }}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium"
                  style={{
                    color: isActive ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.70)",
                    backgroundColor: isActive ? "rgba(196,151,42,0.12)" : "rgba(255,255,255,0.03)",
                    borderLeft: `3px solid ${isActive ? "#C4972A" : "transparent"}`,
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
