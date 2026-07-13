import { redirect } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { CodeEntryForm } from "@/components/lembaga/CodeEntryForm"

export const dynamic = "force-dynamic"

export default async function IcgiCodeEntryPage() {
  const session = await getSession()
  if (session && session.lembaga === "icgi") {
    redirect("/icgi/dashboard")
  }
  return (
    <CodeEntryForm
      lembagaSlug="icgi"
      lembagaLabel="ICGI"
      lembagaTagline="Indonesian Center for Global Innovation"
    />
  )
}
