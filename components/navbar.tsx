"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Database, Menu, Settings, X, ChevronDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  exact: boolean
}

type LembagaConfig = {
  label: string
  tagline: string
  homeHref: string
  abbr: string
  navItems: NavItem[]
}

const CONFIGS: Record<string, LembagaConfig> = {
  alfakhir: {
    label: "Al Fakhir",
    tagline: "Performance Appraisal",
    homeHref: "/alfakhir",
    abbr: "AF",
    navItems: [
      { href: "/alfakhir",          label: "Dashboard",   icon: LayoutDashboard, exact: true  },
      { href: "/alfakhir/admin",    label: "Kelola Data", icon: Database,        exact: false },
      { href: "/alfakhir/settings", label: "Pengaturan",  icon: Settings,        exact: false },
    ],
  },
  iysa: {
    label: "IYSA",
    tagline: "Dashboard Penilaian",
    homeHref: "/iysa/dashboard",
    abbr: "IY",
    navItems: [
      { href: "/iysa/dashboard",  label: "Dashboard",  icon: LayoutDashboard, exact: false },
      { href: "/iysa/settings",   label: "Pengaturan", icon: Settings,        exact: false },
    ],
  },
  icgi: {
    label: "ICGI",
    tagline: "Dashboard Penilaian",
    homeHref: "/icgi/dashboard",
    abbr: "IC",
    navItems: [
      { href: "/icgi/dashboard",  label: "Dashboard",  icon: LayoutDashboard, exact: false },
      { href: "/icgi/settings",   label: "Pengaturan", icon: Settings,        exact: false },
    ],
  },
  iyora: {
    label: "IYORA",
    tagline: "Dashboard Penilaian",
    homeHref: "/iyora/dashboard",
    abbr: "IO",
    navItems: [
      { href: "/iyora/dashboard", label: "Dashboard",  icon: LayoutDashboard, exact: false },
      { href: "/iyora/settings",  label: "Pengaturan", icon: Settings,        exact: false },
    ],
  },
}

const LEMBAGA_GROUP = [
  { key: "iysa",  label: "IYSA",  abbr: "IY", href: "/iysa/dashboard" },
  { key: "icgi",  label: "ICGI",  abbr: "IC", href: "/icgi/dashboard" },
  { key: "iyora", label: "IYORA", abbr: "IO", href: "/iyora/dashboard" },
]

function detectLembaga(pathname: string): string {
  if (pathname.startsWith("/iysa"))    return "iysa"
  if (pathname.startsWith("/icgi"))    return "icgi"
  if (pathname.startsWith("/iyora"))   return "iyora"
  return "alfakhir"
}

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

function LembagaSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const currentItem = LEMBAGA_GROUP.find((l) => l.key === current)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        style={{
          backgroundColor: open ? "rgba(196,151,42,0.18)" : "rgba(196,151,42,0.10)",
          color: "rgba(196,151,42,0.95)",
          border: "1px solid rgba(196,151,42,0.30)",
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(196,151,42,0.18)" }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(196,151,42,0.10)" }}
      >
        <span>{currentItem.label}</span>
        <ChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-[200] min-w-[120px] rounded-xl overflow-hidden"
          style={{
            backgroundColor: "#0F2540",
            border: "1px solid rgba(196,151,42,0.25)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.40)",
          }}
        >
          {LEMBAGA_GROUP.map((l) => (
            <button
              key={l.key}
              onClick={() => { setOpen(false); router.push(l.href) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition-colors"
              style={{
                color: l.key === current ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.70)",
                backgroundColor: l.key === current ? "rgba(196,151,42,0.12)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (l.key !== current) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)"
              }}
              onMouseLeave={(e) => {
                if (l.key !== current) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  backgroundColor: l.key === current ? "rgba(196,151,42,0.25)" : "rgba(255,255,255,0.10)",
                  color: l.key === current ? "#E8B84B" : "rgba(255,255,255,0.55)",
                }}
              >
                {l.abbr}
              </div>
              {l.label}
              {l.key === current && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#C4972A" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => { setOpen(false) }, [path])

  const lembagaKey = detectLembaga(path)
  const config = CONFIGS[lembagaKey]
  const isLembagaGroup = lembagaKey !== "alfakhir"

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
        <div className="flex items-center gap-3">
          <Link href={config.homeHref} className="flex items-center gap-3">
            {!logoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/logo?lembaga=${lembagaKey}`}
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
                {config.abbr}
              </div>
            )}
            <div className="leading-tight">
              <div className="font-semibold text-sm tracking-wide" style={{ color: "rgba(196,151,42,0.95)" }}>
                {config.label}
              </div>
              <div
                className="text-[10px] tracking-widest uppercase hidden sm:block"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {config.tagline}
              </div>
            </div>
          </Link>

          {/* Lembaga switcher — only for iysa/icgi/iyora */}
          {isLembagaGroup && (
            <div className="hidden md:block ml-1">
              <LembagaSwitcher current={lembagaKey} />
            </div>
          )}
        </div>

        {/* Desktop nav */}
        <div
          className="hidden md:flex items-center gap-0.5 rounded-lg p-1"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {config.navItems.map((item) => {
            const active = isActive(path, item.href, item.exact)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  color: active ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.65)",
                  backgroundColor: active ? "rgba(196,151,42,0.12)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)"
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
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
            {/* Lembaga switcher on mobile */}
            {isLembagaGroup && (
              <div className="mb-2 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-[9px] uppercase tracking-widest mb-1.5 px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Pilih Lembaga
                </div>
                <div className="flex gap-1.5">
                  {LEMBAGA_GROUP.map((l) => (
                    <Link
                      key={l.key}
                      href={l.href}
                      className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-center"
                      style={{
                        backgroundColor: l.key === lembagaKey ? "rgba(196,151,42,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${l.key === lembagaKey ? "rgba(196,151,42,0.30)" : "transparent"}`,
                        color: l.key === lembagaKey ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.55)",
                      }}
                    >
                      <span className="text-[9px] font-bold">{l.abbr}</span>
                      <span className="text-[10px] font-medium">{l.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {config.navItems.map((item) => {
              const active = isActive(path, item.href, item.exact)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
                  style={{
                    color: active ? "rgba(196,151,42,0.95)" : "rgba(255,255,255,0.65)",
                    backgroundColor: active ? "rgba(196,151,42,0.10)" : "rgba(255,255,255,0.03)",
                    borderLeft: `3px solid ${active ? "#C4972A" : "transparent"}`,
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
