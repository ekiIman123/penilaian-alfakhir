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
      {/* Page header */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)",
          boxShadow: "0 4px 20px rgba(15,37,64,0.22)",
        }}
      >
        <div className="px-6 py-6 md:px-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(196,151,42,0.15)" }}>
              <Settings size={16} style={{ color: "#C4972A" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
                SMP Al Fakhir · Admin
              </p>
              <h1 className="text-xl font-bold text-white leading-tight">Pengaturan Umum</h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>
                Data lembaga, periode penilaian, pejabat &amp; logo untuk laporan PDF
              </p>
            </div>
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />
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
