"use client"
import { useState } from "react"
import type { Criterion } from "@/lib/rubrics"

interface Props {
  criterion: Criterion
  value: number | null
  onChange: (score: number) => void
  sectionColor: string
}

export function StarRating({ criterion, value, onChange, sectionColor }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value
  const selectedOption = criterion.options.find((o) => o.score === display)

  return (
    <div
      className="rounded-2xl bg-white"
      style={{
        borderLeft: value ? `4px solid ${sectionColor}` : "4px solid #DDE3EC",
        boxShadow: value
          ? `0 1px 6px rgba(0,0,0,0.06), 0 0 0 1px ${sectionColor}22`
          : "0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px #DDE3EC",
        padding: "1rem 1.1rem 0.9rem 1rem",
      }}
    >
      {/* Label row */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-2 h-2 rounded-full shrink-0 mt-px"
          style={{ backgroundColor: sectionColor }}
        />
        <span className="font-semibold text-sm text-gray-800 leading-snug flex-1">
          {criterion.label}
        </span>
        {value && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ color: sectionColor, backgroundColor: `${sectionColor}18` }}
          >
            Skor {value}
          </span>
        )}
      </div>

      {/* Score buttons */}
      <div className="flex gap-2 mb-3">
        {[1, 2, 3, 4].map((n) => {
          const isSelected = value === n
          const isHovered = hovered === n
          const isActive = isSelected || isHovered

          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(n)}
              className="flex-1 h-14 flex flex-col items-center justify-center rounded-xl border-2 transition-colors duration-150 focus:outline-none"
              style={{
                borderColor: isActive ? sectionColor : "#E5E7EB",
                backgroundColor: isSelected
                  ? sectionColor
                  : isHovered
                  ? `${sectionColor}15`
                  : "#FAFAFA",
                transform: isSelected ? "scale(1.05)" : "scale(1)",
                boxShadow: isSelected ? `0 4px 14px ${sectionColor}40` : "none",
              }}
            >
              <span
                className="text-xl font-black leading-none"
                style={{ color: isSelected ? "#FFFFFF" : isHovered ? sectionColor : "#9CA3AF" }}
              >
                {n}
              </span>
              <span
                className="text-[10px] font-semibold mt-0.5 leading-none"
                style={{ color: isSelected ? "rgba(255,255,255,0.75)" : isHovered ? `${sectionColor}BB` : "#D1D5DB" }}
              >
                {n === 1 ? "Kurang" : n === 2 ? "Cukup" : n === 3 ? "Baik" : "Sangat Baik"}
              </span>
            </button>
          )
        })}
      </div>

      {/* Description */}
      <div
        className="text-xs leading-relaxed rounded-xl px-3.5 py-2.5 transition-colors duration-200"
        style={{
          borderLeft: selectedOption ? `3px solid ${sectionColor}` : "3px solid #E5E7EB",
          backgroundColor: selectedOption ? `${sectionColor}08` : "#F9FAFB",
          color: selectedOption ? "#374151" : "#9CA3AF",
          fontStyle: selectedOption ? "normal" : "italic",
          minHeight: "2.5rem",
        }}
      >
        {selectedOption
          ? <><span className="font-bold" style={{ color: sectionColor }}>({selectedOption.score})</span> {selectedOption.text}</>
          : "Pilih skor 1–4 untuk melihat deskripsi kriteria"}
      </div>
    </div>
  )
}
