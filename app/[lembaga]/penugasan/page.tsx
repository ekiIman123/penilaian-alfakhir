import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/lembaga-auth"
import { prisma } from "@/lib/prisma"
import { isLembaga, LEMBAGA, bolehKelolaPeriode } from "@/lib/lembaga"
import { Penugasan } from "@/components/penugasan/Penugasan"

export const dynamic = "force-dynamic"

export default async function PenugasanPage({
  params,
}: {
  params: Promise<{ lembaga: string }>
}) {
  const { lembaga } = await params
  if (!isLembaga(lembaga)) notFound()

  const session = await getSession(lembaga)
  if (!session) redirect(`/${lembaga}`)
  if (!bolehKelolaPeriode(session.role)) redirect(`/${lembaga}/dashboard`)

  const [penilai, karyawan, penugasan] = await Promise.all([
    prisma.evaluator.findMany({
      where: { lembaga },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, divisi: true },
    }),
    prisma.employee.findMany({
      where: { lembaga },
      orderBy: [{ divisi: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, divisi: true },
    }),
    prisma.assignment.findMany({
      where: { lembaga },
      select: { evaluatorId: true, employeeId: true, weight: true },
    }),
  ])

  return (
    <Penugasan
      lembagaSlug={lembaga}
      lembagaLabel={LEMBAGA[lembaga].label}
      penilai={penilai.map((p) => ({ id: p.id, nama: p.name, role: p.role, divisi: p.divisi }))}
      karyawan={karyawan.map((k) => ({ id: k.id, nama: k.name, role: k.role, divisi: k.divisi }))}
      awal={penugasan}
    />
  )
}
