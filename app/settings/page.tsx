import { prisma } from "@/lib/prisma"
import { SettingsForm } from "@/components/settings/settings-form"
import { Settings } from "lucide-react"

export default async function SettingsPage() {
  const settings = await prisma.orgSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  })

  return (
    <div className="space-y-6 animate-in">
      {/* Hero header */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1C0E04 0%, #3B2008 60%, #5C3D11 100%)",
          boxShadow: "0 4px 32px rgba(28,14,4,0.35)",
        }}
      >
        <div className="px-6 py-6 md:px-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(196,151,42,0.18)" }}>
              <Settings size={18} style={{ color: "#C4972A" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
                SMP Al Fakhir · Admin
              </p>
              <h1 className="text-2xl font-black text-white leading-tight">Pengaturan Umum</h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                Data lembaga, periode penilaian, pejabat &amp; logo untuk laporan PDF
              </p>
            </div>
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #C4972A, #E8B84B, #C4972A)" }} />
      </div>

      <SettingsForm
        initial={{
          yayasanName: settings.yayasanName,
          schoolName: settings.schoolName,
          address: settings.address,
          phone: settings.phone,
          city: settings.city,
          periodLabel: settings.periodLabel,
          kepalaSekolah: settings.kepalaSekolah,
          ketuaName: settings.ketuaName,
          ketuaTitle: settings.ketuaTitle,
          logoBase64: settings.logoBase64 ?? null,
        }}
      />
    </div>
  )
}
