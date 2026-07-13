import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { CodeEntryForm } from "@/components/lembaga/CodeEntryForm"

export const dynamic = "force-dynamic"

export default async function IysaCodeEntryPage() {
  const session = await getSession()
  if (session && session.lembaga === "iysa") {
    redirect("/iysa/dashboard")
  }
  return (
    <CodeEntryForm
      lembagaSlug="iysa"
      lembagaLabel="IYSA"
      lembagaTagline="Indonesian Young Scientist Association"
    />
  )
}
