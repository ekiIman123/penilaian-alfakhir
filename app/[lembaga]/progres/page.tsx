import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { getSession } from "@/lib/lembaga-auth"
import { resolvePeriod } from "@/lib/periods"
import { progresPenilai } from "@/lib/progress"
import { isLembaga, LEMBAGA, bolehKelolaPeriode } from "@/lib/lembaga"
import { ProgresTim } from "@/components/progres/ProgresTim"

export const dynamic = "force-dynamic"

export default async function ProgresPage({
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
  // Yang memantau progres adalah yang memimpin: supervisor, CEO, PM, manajemen.
  if (!bolehKelolaPeriode(session.role)) redirect(`/${lembaga}/dashboard`)

  const { periode } = await searchParams
  const period = await resolvePeriod(lembaga, periode)
  const penilai = await progresPenilai(lembaga, period)

  // Tautan dalam pesan pengingat harus alamat yang benar-benar dibuka pengguna.
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")

  return (
    <ProgresTim
      lembagaSlug={lembaga}
      lembagaLabel={LEMBAGA[lembaga].label}
      period={{
        id: period.id,
        label: period.label,
        status: period.status,
        dapatDinilai: period.dapatDinilai,
        sisaHari: period.sisaHari,
      }}
      penilai={penilai}
      asalTautan={`${proto}://${host}`}
    />
  )
}
