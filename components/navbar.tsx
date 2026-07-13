"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Database, Menu, Settings, X } from "lucide-react"
import { useState, useEffect } from "react"

const NAV_ITEMS = [
  { href: "/alfakhir",          label: "Dashboard",   icon: LayoutDashboard, exact: true,  accent: false },
  { href: "/alfakhir/admin",    label: "Kelola Data", icon: Database,        exact: false, accent: false },
  { href: "/alfakhir/settings", label: "Pengaturan",  icon: Settings,        exact: false, accent: false },
] as const

function active(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

export function Navbar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => { setOpen(false) }, [path])

  return (
    <nav
      className="sticky top-0 z-50 text-white"
      style={{
        backgroundColor: "#0F2540",
        boxShadow: "0 2px 0 #C4972A, 0 4px 20px rgba(15,37,64,0.35)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Brand */}
        <Link href="/alfakhir" className="flex items-center gap-3">
          {!logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/api/logo"
              alt="Logo"
              className="h-9 w-auto shrink-0"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
              style={{
                background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                color: "#0F2540",
              }}
            >
              AF
            </div>
          )}
          <div className="leading-tight">
            <div className="font-semibold text-sm tracking-wide" style={{ color: "rgba(196,151,42,0.95)" }}>
              Al Fakhir
            </div>
            <div
              className="text-[10px] tracking-widest uppercase hidden sm:block"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Performance Appraisal
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div
          className="hidden md:flex items-center gap-0.5 rounded-lg p-1"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = active(path, item.href, item.exact)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.65)",
                  backgroundColor: isActive ? "rgba(196,151,42,0.12)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
                }}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
          style={{
            color: "rgba(255,255,255,0.80)",
            backgroundColor: open ? "rgba(196,151,42,0.12)" : "transparent",
            border: "1px solid",
            borderColor: open ? "rgba(196,151,42,0.30)" : "transparent",
          }}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="md:hidden"
          style={{
            backgroundColor: "#091526",
            borderTop: "1px solid rgba(196,151,42,0.15)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = active(path, item.href, item.exact)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
                  style={{
                    color: isActive ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.65)",
                    backgroundColor: isActive ? "rgba(196,151,42,0.10)" : "rgba(255,255,255,0.03)",
                    borderLeft: `3px solid ${isActive ? "#C4972A" : "transparent"}`,
                  }}
                >
                  <Icon size={16} />
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
