import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { prisma } from "@/lib/prisma"
import { SettingsTabLayout } from "@/components/settings/SettingsTabLayout"

export const dynamic = "force-dynamic"

const ALLOWED_ROLES = ["supervisor", "founder", "management", "superadmin"]

export default async function IysaSettingsPage() {
  const session = await getSession()
  const allowed = session && (session.lembaga === "iysa" || session.lembaga === "all")
  if (!allowed) redirect("/iysa")
  if (!ALLOWED_ROLES.includes(session!.role)) redirect("/iysa/dashboard")

  const settings = await prisma.orgSettings.upsert({
    where: { id: "iysa" },
    create: { id: "iysa" },
    update: {},
  })

  return (
    <SettingsTabLayout
      lembagaSlug="iysa"
      lembagaLabel="IYSA"
      initial={{
        yayasanName:            settings.yayasanName,
        schoolName:             settings.schoolName,
        address:                settings.address,
        phone:                  settings.phone,
        city:                   settings.city,
        periodLabel:            settings.periodLabel,
        kepalaSekolah:          settings.kepalaSekolah,
        kepalaTitle:            settings.kepalaTitle,
        kepalaSignatureBase64:  settings.kepalaSignatureBase64 ?? null,
        signer2Name:            settings.signer2Name,
        signer2Title:           settings.signer2Title,
        signer2SignatureBase64: settings.signer2SignatureBase64 ?? null,
        ketuaName:              settings.ketuaName,
        ketuaTitle:             settings.ketuaTitle,
        ketuaSignatureBase64:   settings.ketuaSignatureBase64 ?? null,
        logoBase64:             settings.logoBase64 ?? null,
      }}
    />
  )
}
