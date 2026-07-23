"use client"

import { useState } from "react"
import { Settings, Settings2, Users } from "lucide-react"
import { SettingsForm, type OrgSettingsForm } from "./settings-form"
import { MemberManagement } from "./MemberManagement"

type Tab = "settings" | "members"

interface Props {
  lembagaSlug: string
  lembagaLabel: string
  initial: OrgSettingsForm
}

export function SettingsTabLayout({ lembagaSlug, lembagaLabel, initial }: Props) {
  const [tab, setTab] = useState<Tab>("settings")

  const tabs = [
    { id: "settings" as const, label: "Pengaturan Umum", icon: <Settings2 size={13} /> },
    { id: "members"  as const, label: "Kelola Anggota",  icon: <Users size={13} /> },
  ]

  return (
    <div className="space-y-6 animate-in">
      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <div className="px-6 pt-6 pb-5 md:px-8">
          {/* Title */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(196,151,42,0.15)" }}
            >
              <Settings size={16} style={{ color: "#C4972A" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
                {lembagaLabel} · Pengaturan
              </p>
              <h1 className="text-xl font-bold text-white leading-tight">Pengaturan</h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>
                Data lembaga, pejabat, logo, dan kelola data anggota
              </p>
            </div>
          </div>

          {/* Tab nav */}
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)" }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold flex-1 justify-center transition-all"
                style={
                  tab === t.id
                    ? { backgroundColor: "#FFFFFF", color: "#1E3A5F", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }
                    : { color: "rgba(255,255,255,0.55)" }
                }
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <SettingsForm lembagaId={lembagaSlug} initial={initial} />
      )}
      {tab === "members" && (
        <MemberManagement lembagaSlug={lembagaSlug} />
      )}
    </div>
  )
}
