"use client"

import { useState } from "react"
import { GraduationCap, UserCheck } from "lucide-react"
import { ManageList } from "./manage-list"

interface Person {
  id: string
  name: string
  evaluationCount: number
}

interface Props {
  guruData: Person[]
  penilaiData: Person[]
}

export function AdminTabs({ guruData, penilaiData }: Props) {
  const [tab, setTab] = useState<"guru" | "penilai">("guru")

  const tabs = [
    { key: "guru" as const, label: "Guru", icon: GraduationCap, count: guruData.length },
    { key: "penilai" as const, label: "Penilai", icon: UserCheck, count: penilaiData.length },
  ]

  return (
    <>
      {/* Mobile: tab switcher */}
      <div className="md:hidden space-y-3">
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(196,151,42,0.2)", backgroundColor: "rgba(255,255,255,0.5)" }}
        >
          {tabs.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors"
                style={{
                  backgroundColor: active ? "#2C1A08" : "transparent",
                  color: active ? "#C4972A" : "#78716C",
                }}
              >
                <t.icon size={15} />
                {t.label}
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-black"
                  style={{
                    backgroundColor: active ? "rgba(196,151,42,0.25)" : "#F3F4F6",
                    color: active ? "#E8B84B" : "#6B7280",
                  }}
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="card p-5">
          {tab === "guru" ? (
            <ManageList people={guruData} type="guru" />
          ) : (
            <ManageList people={penilaiData} type="penilai" />
          )}
        </div>
      </div>

      {/* Desktop: two-column grid */}
      <div className="hidden md:grid grid-cols-2 gap-6">
        <div className="card p-5">
          <ManageList people={guruData} type="guru" />
        </div>
        <div className="card p-5">
          <ManageList people={penilaiData} type="penilai" />
        </div>
      </div>
    </>
  )
}
