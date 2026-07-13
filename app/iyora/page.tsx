import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { CodeEntryForm } from "@/components/lembaga/CodeEntryForm"

export const dynamic = "force-dynamic"

export default async function IyoraCodeEntryPage() {
  const session = await getSession()
  if (session && session.lembaga === "iyora") {
    redirect("/iyora/dashboard")
  }
  return (
    <CodeEntryForm
      lembagaSlug="iyora"
      lembagaLabel="IYORA"
      lembagaTagline="Indonesian Young Researchers Association"
    />
  )
}
