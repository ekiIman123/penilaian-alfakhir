import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TeacherRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/alfakhir/teachers/${id}`)
}
