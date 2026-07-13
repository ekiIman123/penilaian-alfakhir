import { redirect } from "next/navigation"

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function FormRedirect({ searchParams }: Props) {
  const params = await searchParams
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>
  ).toString()
  redirect(`/alfakhir/form${qs ? `?${qs}` : ""}`)
}
