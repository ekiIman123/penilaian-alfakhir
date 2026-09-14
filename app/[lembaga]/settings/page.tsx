import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { prisma } from "@/lib/prisma"
import { isLembaga, LEMBAGA, bolehKelolaLembaga } from "@/lib/lembaga"
import { SettingsTabLayout } from "@/components/settings/SettingsTabLayout"

export const dynamic = "force-dynamic"

/**
 * CEO dan PM adalah pemimpin tunggal di lembaganya, jadi mereka juga
 * mengelola pengaturan lembaga sendiri — setara supervisor di IYSA.
 */
function bolehAtur(role: string, lembaga: string): boolean {
  if (bolehKelolaLembaga(role)) return true
  if (role === "ceo" && lembaga === "icgi") return true
  if (role === "pm" && lembaga === "iyora") return true
  return false
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lembaga: string }>
}) {
  const { lembaga } = await params
  if (!isLembaga(lembaga)) notFound()

  const session = await getSession(lembaga)
  if (!session) redirect(`/${lembaga}`)
  if (!bolehAtur(session.role, lembaga)) redirect(`/${lembaga}/dashboard`)

  const settings = await prisma.orgSettings.upsert({
    where: { id: lembaga },
    create: { id: lembaga },
    update: {},
  })

  return (
    <SettingsTabLayout
      lembagaSlug={lembaga}
      lembagaLabel={LEMBAGA[lembaga].label}
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
