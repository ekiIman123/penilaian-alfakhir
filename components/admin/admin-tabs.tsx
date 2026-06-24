"use client"

import { useState } from "react"
import { GraduationCap, Briefcase, UserCheck } from "lucide-react"
import { ManageList } from "./manage-list"

interface Person {
  id: string
  name: string
  role?: string
  evaluationCount: number
}

interface Props {
  guruData: Person[]
  staffData: Person[]
  penilaiData: Person[]
}

export function AdminTabs({ guruData, staffData, penilaiData }: Props) {
  const [tab, setTab] = useState<"guru" | "staff" | "penilai">("guru")

  const tabs = [
    { key: "guru" as const,    label: "Guru",    icon: GraduationCap, count: guruData.length },
    { key: "staff" as const,   label: "Staf",    icon: Briefcase,     count: staffData.length },
    { key: "penilai" as const, label: "Penilai", icon: UserCheck,     count: penilaiData.length },
  ]

  const currentData = tab === "guru" ? guruData : tab === "staff" ? staffData : penilaiData

  return (
    <div className="card">
      {/* Tabs row */}
      <div className="px-5 pt-3.5 pb-0 flex items-center gap-2" style={{ borderBottom: "1px solid #DDE3EC" }}>
        {tabs.map((t) => {
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors mb-3"
              style={
                isActive
                  ? { backgroundColor: "#0F2540", color: "#FFFFFF" }
                  : { backgroundColor: "#EDF0F5", color: "#64748B" }
              }
            >
              <t.icon size={11} />
              {t.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "#DDE3EC",
                  color: isActive ? "#FFFFFF" : "#94A3B8",
                }}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <ManageList key={tab} people={currentData} type={tab} />
    </div>
  )
}
