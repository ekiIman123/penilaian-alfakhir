import { redirect } from "next/navigation"
import { LEMBAGA_SLUGS } from "@/lib/lembaga"

export default function RootPage() {
  redirect(`/${LEMBAGA_SLUGS[0]}`)
}
