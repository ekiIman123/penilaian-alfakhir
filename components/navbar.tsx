"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, Database, Menu, Settings, X, ChevronDown, CalendarRange,
  Gauge, Users, Scale, Map as MapIcon, FileText,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { LEMBAGA, LEMBAGA_SLUGS, type LembagaSlug } from "@/lib/lembaga"

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  exact: boolean
  /** Peran yang boleh melihat menu ini; kosong berarti semua. */
  peran?: readonly string[]
}

const PEMIMPIN = ["supervisor", "ceo", "pm", "founder", "management", "superadmin"] as const
const PENGATUR = ["supervisor", "ceo", "pm", "founder", "management", "superadmin"] as const

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
  // Ketiga lembaga dilayani satu pohon rute, jadi menunya diturunkan dari
  // daftar lembaga — bukan ditulis ulang tiga kali seperti sebelumnya.
  ...Object.fromEntries(
    LEMBAGA_SLUGS.map((slug) => [
      slug,
      {
        label: LEMBAGA[slug].label,
        tagline: "Dashboard Penilaian",
        homeHref: `/${slug}/dashboard`,
        abbr: LEMBAGA[slug].abbr,
        navItems: [
          { href: `/${slug}/dashboard`,  label: "Dashboard",  icon: LayoutDashboard, exact: false },
          { href: `/${slug}/progres`,    label: "Progres",    icon: Gauge,           exact: false, peran: PEMIMPIN },
          { href: `/${slug}/kalibrasi`,  label: "Kalibrasi",  icon: Scale,           exact: false, peran: PEMIMPIN },
          { href: `/${slug}/penugasan`,  label: "Penugasan",  icon: Users,           exact: false, peran: PENGATUR },
          { href: `/${slug}/periode`,    label: "Periode",    icon: CalendarRange,   exact: false, peran: PEMIMPIN },
          { href: `/${slug}/settings`,   label: "Pengaturan", icon: Settings,        exact: false, peran: PENGATUR },
        ],
      } satisfies LembagaConfig,
    ])
  ),
}

CONFIGS.beranda = {
  label: "Penilaian Kinerja",
  tagline: "IYSA · ICGI · IYORA",
  homeHref: "/beranda",
  abbr: "PK",
  navItems: [{ href: "/beranda", label: "Peta Lembaga", icon: MapIcon, exact: true }],
}

CONFIGS.saya = {
  label: "Rapor Saya",
  tagline: "Penilaian Kinerja",
  homeHref: "/saya",
  abbr: "RS",
  navItems: [{ href: "/saya", label: "Rapor Saya", icon: FileText, exact: true }],
}

const LEMBAGA_GROUP = LEMBAGA_SLUGS.map((slug) => ({
  key: slug,
  label: LEMBAGA[slug].label,
  abbr: LEMBAGA[slug].abbr,
  href: `/${slug}/dashboard`,
}))

function detectLembaga(pathname: string): string {
  const seg = pathname.split("/")[1]
  if (LEMBAGA_SLUGS.includes(seg as LembagaSlug)) return seg
  if (seg === "beranda" || seg === "saya") return seg
  return "alfakhir"
}

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

function LembagaSwitcher({ current, tersedia }: { current: string; tersedia: string[] }) {
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

  const pilihan = LEMBAGA_GROUP.filter((l) => tersedia.includes(l.key))
  const currentItem = LEMBAGA_GROUP.find((l) => l.key === current)

  // Kalau orang ini hanya memegang satu lembaga, tidak ada yang perlu dipilih.
  if (!currentItem || pilihan.length < 2) return null

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
          {pilihan.map((l) => (
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
  const [tersedia, setTersedia] = useState<string[]>([])
  const [hats, setHats] = useState<{ lembaga: string; role: string }[]>([])

  useEffect(() => { setOpen(false) }, [path])

  useEffect(() => {
    let batal = false
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (batal) return
        setTersedia(Array.isArray(d?.lembagaList) ? d.lembagaList : [])
        setHats(Array.isArray(d?.hats) ? d.hats : [])
        if (d?.isSuperadmin) setHats([{ lembaga: "all", role: "superadmin" }])
      })
      .catch(() => {})
    return () => { batal = true }
  }, [path])

  const lembagaKey = detectLembaga(path)
  const config = CONFIGS[lembagaKey]
  const isLembagaGroup = LEMBAGA_SLUGS.includes(lembagaKey as LembagaSlug) || lembagaKey === "beranda"

  // Menu yang tidak bisa dibuka lebih baik tidak ditampilkan sama sekali,
  // daripada ditampilkan lalu memantulkan orang kembali ke dashboard.
  const peranDiSini =
    hats.find((h) => h.lembaga === lembagaKey)?.role ??
    (hats.some((h) => h.role === "superadmin") ? "superadmin" : null)

  const punyaPeta =
    hats.some((h) => ["management", "founder", "superadmin"].includes(h.role))

  const navItems = config.navItems.filter(
    (item) => !item.peran || (peranDiSini !== null && item.peran.includes(peranDiSini)),
  )

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

          {/* Pemilih lembaga — hanya untuk yang memegang lebih dari satu */}
          {isLembagaGroup && (
            <div className="hidden md:block ml-1">
              <LembagaSwitcher current={lembagaKey} tersedia={tersedia} />
            </div>
          )}

          {/* Manajemen selalu punya jalan kembali ke peta tiga lembaga */}
          {punyaPeta && lembagaKey !== "beranda" && (
            <Link
              href="/beranda"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ml-1"
              style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <MapIcon size={12} /> Peta
            </Link>
          )}
        </div>

        {/* Desktop nav */}
        <div
          className="hidden md:flex items-center gap-0.5 rounded-lg p-1"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {navItems.map((item) => {
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
            {isLembagaGroup && tersedia.length > 1 && (
              <div className="mb-2 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-[9px] uppercase tracking-widest mb-1.5 px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Pilih Lembaga
                </div>
                <div className="flex gap-1.5">
                  {LEMBAGA_GROUP.filter((l) => tersedia.includes(l.key)).map((l) => (
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

            {navItems.map((item) => {
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
