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
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid #DDE3EC", backgroundColor: "#F8FAFC" }}
        >
          {tabs.map((t) => {
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? "#0F2540" : "transparent",
                  color: isActive ? "#C4972A" : "#64748B",
                }}
              >
                <t.icon size={14} />
                {t.label}
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: isActive ? "rgba(196,151,42,0.20)" : "#E2E8F0",
                    color: isActive ? "#E8B84B" : "#64748B",
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
