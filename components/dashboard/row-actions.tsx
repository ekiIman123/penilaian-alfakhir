"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { MoreHorizontal, Eye, ClipboardEdit } from "lucide-react"

interface Grade {
  label: string
  color: string
  bg: string
}

export function RowActionsMenu({
  teacherId,
  grade,
}: {
  teacherId: string
  grade: Grade | null
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
        style={{
          backgroundColor: open ? "rgba(30,58,95,0.10)" : "rgba(0,0,0,0.05)",
          color: "#1E3A5F",
        }}
        aria-label="Aksi"
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden flex flex-col"
          style={{
            minWidth: 120,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            border: "1px solid #DDE3EC",
          }}
        >
          {grade && (
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #EDF0F5" }}>
              <span
                className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{ color: grade.color, backgroundColor: grade.bg }}
              >
                {grade.label}
              </span>
            </div>
          )}
          <Link
            href={`/teachers/${teacherId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-slate-50"
            style={{ color: "#1A2233" }}
          >
            <Eye size={13} />
            Detail
          </Link>
          <Link
            href={`/form?teacherId=${teacherId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-white"
            style={{ backgroundColor: "#1E3A5F" }}
          >
            <ClipboardEdit size={13} />
            Nilai
          </Link>
        </div>
      )}
    </div>
  )
}
