import { prisma } from "./prisma"
import type { PeriodInfo } from "./periods"

export type ProgresPenilai = {
  evaluatorId: string
  nama: string
  role: string
  phone: string | null
  ditugaskan: number
  terkirim: number
  draf: number
  belum: number
  persen: number
}

/**
 * Siapa yang sudah dan belum mengisi pada satu periode.
 *
 * Dihitung dari penugasan, bukan dari jumlah penilaian yang masuk — supaya
 * penilai yang belum menyentuh aplikasi sama sekali tetap muncul di daftar.
 * Justru merekalah yang perlu diingatkan.
 */
export async function progresPenilai(
  lembaga: string,
  period: PeriodInfo,
): Promise<ProgresPenilai[]> {
  const penugasan = await prisma.assignment.groupBy({
    by: ["evaluatorId"],
    where: {
      lembaga,
      OR: [{ activeTo: null }, { activeTo: { gt: new Date() } }],
    },
    _count: { _all: true },
  })
  if (penugasan.length === 0) return []

  const ids = penugasan.map((p) => p.evaluatorId)
  const [penilai, penilaian] = await Promise.all([
    prisma.evaluator.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, role: true, phone: true },
    }),
    prisma.evaluation.groupBy({
      by: ["evaluatorId", "status"],
      where: { periodId: period.id, evaluatorId: { in: ids } },
      _count: { _all: true },
    }),
  ])

  const info = new Map(penilai.map((p) => [p.id, p]))

  return penugasan
    .map((p) => {
      const i = info.get(p.evaluatorId)
      const ditugaskan = p._count._all
      const terkirim = penilaian.find((x) => x.evaluatorId === p.evaluatorId && x.status === "terkirim")?._count._all ?? 0
      const draf = penilaian.find((x) => x.evaluatorId === p.evaluatorId && x.status === "draf")?._count._all ?? 0
      return {
        evaluatorId: p.evaluatorId,
        nama: i?.name ?? "Penilai",
        role: i?.role ?? "",
        phone: i?.phone ?? null,
        ditugaskan,
        terkirim,
        draf,
        belum: Math.max(0, ditugaskan - terkirim),
        persen: ditugaskan > 0 ? Math.round((terkirim / ditugaskan) * 100) : 0,
      }
    })
    .sort((a, b) => a.persen - b.persen || a.nama.localeCompare(b.nama))
}
