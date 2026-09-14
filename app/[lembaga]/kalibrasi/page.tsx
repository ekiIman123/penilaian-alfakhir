import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { resolvePeriod } from "@/lib/periods"
import { dataKalibrasi } from "@/lib/calibration"
import { isLembaga, LEMBAGA, bolehKelolaPeriode } from "@/lib/lembaga"
import { Kalibrasi } from "@/components/kalibrasi/Kalibrasi"

export const dynamic = "force-dynamic"

export default async function KalibrasiPage({
  params,
  searchParams,
}: {
  params: Promise<{ lembaga: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  const { lembaga } = await params
  if (!isLembaga(lembaga)) notFound()

  const session = await getSession(lembaga)
  if (!session) redirect(`/${lembaga}`)
  if (!bolehKelolaPeriode(session.role)) redirect(`/${lembaga}/dashboard`)

  const { periode } = await searchParams
  const period = await resolvePeriod(lembaga, periode)
  const data = await dataKalibrasi(lembaga, period)

  return (
    <Kalibrasi
      lembagaSlug={lembaga}
      lembagaLabel={LEMBAGA[lembaga].label}
      period={{ id: period.id, label: period.label, status: period.status }}
      data={data}
    />
  )
}
