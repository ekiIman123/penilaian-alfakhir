"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, GraduationCap, Briefcase, Check } from "lucide-react"

interface Teacher {
  id: string
  name: string
  role: string
}

export function TeacherSwitcher({ currentId, teachers }: { currentId: string; teachers: Teacher[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const current = teachers.find((t) => t.id === currentId)
  const gurus = teachers.filter((t) => t.role !== "staff")
  const staff = teachers.filter((t) => t.role === "staff")

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [currentId])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors max-w-[260px] sm:max-w-none"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #DDE3EC",
          color: "#1A2233",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#EDF0F5" }}
        >
          {current?.role === "staff"
            ? <Briefcase size={10} style={{ color: "#64748B" }} />
            : <GraduationCap size={10} style={{ color: "#64748B" }} />}
        </div>
        <span className="truncate">{current?.name ?? "Pilih..."}</span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: current?.role === "staff" ? "#F5F3FF" : "#EFF6FF", color: current?.role === "staff" ? "#6D28D9" : "#1D4ED8" }}
        >
          {current?.role === "staff" ? "Staf" : "Guru"}
        </span>
        <ChevronDown
          size={12}
          style={{ color: "#94A3B8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl py-2"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DDE3EC",
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            minWidth: "240px",
            maxHeight: "360px",
            overflowY: "auto",
          }}
        >
          {gurus.length > 0 && (
            <>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#94A3B8" }}
              >
                <GraduationCap size={10} />
                Guru ({gurus.length})
              </div>
              {gurus.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { router.push(`/alfakhir/teachers/${t.id}`); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors"
                  style={{
                    color: t.id === currentId ? "#1D4ED8" : "#374151",
                    backgroundColor: t.id === currentId ? "#EFF6FF" : "transparent",
                    fontWeight: t.id === currentId ? 600 : 400,
                  }}
                >
                  <span className="truncate">{t.name}</span>
                  {t.id === currentId && <Check size={12} style={{ color: "#1D4ED8", flexShrink: 0 }} />}
                </button>
              ))}
            </>
          )}
          {staff.length > 0 && (
            <>
              {gurus.length > 0 && <div style={{ height: "1px", backgroundColor: "#EDF0F5", margin: "6px 0" }} />}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#94A3B8" }}
              >
                <Briefcase size={10} />
                Staf ({staff.length})
              </div>
              {staff.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { router.push(`/alfakhir/teachers/${t.id}`); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors"
                  style={{
                    color: t.id === currentId ? "#6D28D9" : "#374151",
                    backgroundColor: t.id === currentId ? "#F5F3FF" : "transparent",
                    fontWeight: t.id === currentId ? 600 : 400,
                  }}
                >
                  <span className="truncate">{t.name}</span>
                  {t.id === currentId && <Check size={12} style={{ color: "#6D28D9", flexShrink: 0 }} />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
