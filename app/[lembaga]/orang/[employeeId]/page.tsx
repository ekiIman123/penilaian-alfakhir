import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { riwayatOrang } from "@/lib/person-history"
import { isLembaga, peranPuncak } from "@/lib/lembaga"
import { ProfilOrang } from "@/components/orang/ProfilOrang"

export const dynamic = "force-dynamic"

export default async function OrangPage({
  params,
}: {
  params: Promise<{ lembaga: string; employeeId: string }>
}) {
  const { lembaga, employeeId } = await params
  if (!isLembaga(lembaga)) notFound()

  const session = await getSession(lembaga)
  if (!session) redirect(`/${lembaga}`)

  // Hanya orang yang memang berhak menilai atau memantau yang boleh membuka
  // profil seseorang — bukan siapa saja yang bisa masuk ke lembaga ini.
  const evaluatees = await getEvaluatees(session, lembaga)
  const bolehLihat =
    peranPuncak(session.role) || evaluatees.some((e) => e.id === employeeId)
  if (!bolehLihat) redirect(`/${lembaga}/dashboard`)

  const data = await riwayatOrang(employeeId, lembaga)
  if (!data) notFound()

  return (
    <ProfilOrang
      data={data}
      lembagaSlug={lembaga}
      bolehLihatCatatan={true}
    />
  )
}
