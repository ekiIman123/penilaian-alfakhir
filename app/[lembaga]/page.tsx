import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { isLembaga, LEMBAGA } from "@/lib/lembaga"
import { CodeEntryForm } from "@/components/lembaga/CodeEntryForm"

export const dynamic = "force-dynamic"

export default async function CodeEntryPage({
  params,
}: {
  params: Promise<{ lembaga: string }>
}) {
  const { lembaga } = await params
  if (!isLembaga(lembaga)) notFound()

  const session = await getSession(lembaga)
  if (session) redirect(`/${lembaga}/dashboard`)

  const info = LEMBAGA[lembaga]
  return (
    <CodeEntryForm
      lembagaSlug={lembaga}
      lembagaLabel={info.label}
      lembagaTagline={info.tagline}
    />
  )
}
