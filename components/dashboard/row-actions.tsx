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
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
        style={{
          backgroundColor: open ? "rgba(92,61,17,0.12)" : "rgba(0,0,0,0.05)",
          color: "#5C3D11",
        }}
        aria-label="Aksi"
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden flex flex-col"
          style={{
            minWidth: 120,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 4px 20px rgba(0,0,0,0.13)",
            border: "1px solid rgba(231,221,208,0.8)",
          }}
        >
          {grade && (
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #F3EDE6" }}>
              <span
                className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                style={{ color: grade.color, backgroundColor: grade.bg }}
              >
                {grade.label}
              </span>
            </div>
          )}
          <Link
            href={`/teachers/${teacherId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-stone-50"
            style={{ color: "#1C1917" }}
          >
            <Eye size={13} />
            Detail
          </Link>
          <Link
            href={`/form?teacherId=${teacherId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold"
            style={{ backgroundColor: "#C4972A", color: "#1C1409" }}
          >
            <ClipboardEdit size={13} />
            Nilai
          </Link>
        </div>
      )}
    </div>
  )
}
