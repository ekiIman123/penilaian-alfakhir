import { prisma } from "./prisma"
import { AG_SECTIONS } from "./rubrics"
import { calcSectionRaw, parseScores } from "./calculations"
import { rubricTypeFor } from "./lembaga-evaluatees"
import { bobotUntukPeran, rataTertimbang } from "./weights"
import { shortLabel } from "./period-format"

export type TitikTren = {
  periodId: string
  label: string
  pendek: string
  status: string
  /** Persen dari nilai maksimal rubrik orang ini. */
  persen: number | null
  total: number | null
  maks: number
  /** Nilai per aspek, dalam skala 1–4 supaya bisa dibandingkan antar aspek. */
  aspek: (number | null)[]
  jumlahPenilai: number
  catatan: { penilai: string; teks: string }[]
  finalCatatan: string | null
  dibekukan: boolean
}

export type RiwayatOrang = {
  id: string
  nama: string
  role: string
  divisi: string | null
  lembaga: string
  rubricType: "ae" | "ag"
  aspekDipakai: { id: string; label: string; maxScore: number }[]
  tren: TitikTren[]
}

function pecahCatatan(raw: string | null): string {
  if (!raw) return ""
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === "object" && !Array.isArray(p)) {
      return Object.values(p as Record<string, string>).map((v) => v?.trim()).filter(Boolean).join("; ")
    }
  } catch { /* catatan lama tersimpan sebagai teks biasa */ }
  return raw
}

/**
 * Riwayat seseorang lintas periode.
 *
 * Inilah yang baru mungkin setelah penilaian punya dimensi waktu: melihat
 * apakah seseorang membaik, dan di aspek mana.
 */
export async function riwayatOrang(
  employeeId: string,
  lembaga: string,
  bulanTerakhir = 12,
): Promise<RiwayatOrang | null> {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, lembaga },
    select: { id: true, name: true, role: true, divisi: true, lembaga: true, finalCatatan: true },
  })
  if (!emp) return null

  const rubricType = rubricTypeFor(emp.role)
  const applicable = rubricType === "ae" ? 5 : 7
  const maks = rubricType === "ae" ? 60 : 84

  const periods = await prisma.period.findMany({
    where: { lembaga },
    orderBy: [{ year: "asc" }, { month: "asc" }],
    take: bulanTerakhir,
  })

  const [evals, hasil] = await Promise.all([
    prisma.evaluation.findMany({
      where: { employeeId, status: "terkirim", periodId: { in: periods.map((p) => p.id) } },
      select: {
        periodId: true, evaluatorId: true, scores: true, catatan: true,
        evaluator: { select: { name: true, role: true } },
      },
    }),
    prisma.periodResult.findMany({
      where: { employeeId, periodId: { in: periods.map((p) => p.id) } },
      select: { periodId: true, totalScore: true, finalCatatan: true },
    }),
  ])

  const penugasan = await prisma.assignment.findMany({
    where: { employeeId, evaluatorId: { in: [...new Set(evals.map((e) => e.evaluatorId))] } },
    select: { evaluatorId: true, weight: true },
  })
  const bobotKhusus = new Map(penugasan.map((a) => [a.evaluatorId, a.weight]))
  const hasilPer = new Map(hasil.map((h) => [h.periodId, h]))

  const tren: TitikTren[] = periods.map((p) => {
    const rows = evals.filter((e) => e.periodId === p.id)
    const beku = hasilPer.get(p.id)

    if (rows.length === 0) {
      return {
        periodId: p.id, label: p.label, pendek: shortLabel(p.year, p.month), status: p.status,
        persen: null, total: null, maks, aspek: Array(applicable).fill(null),
        jumlahPenilai: 0, catatan: [], finalCatatan: beku?.finalCatatan ?? null,
        dibekukan: !!beku,
      }
    }

    const berbobot = rows.map((r) => ({
      scores: parseScores(r.scores),
      bobot: bobotKhusus.get(r.evaluatorId) ?? bobotUntukPeran(r.evaluator.role),
    }))

    const aspek = AG_SECTIONS.slice(0, applicable).map((sec) => {
      const rata = rataTertimbang(
        berbobot.map((b) => ({ nilai: calcSectionRaw(b.scores, sec.id, AG_SECTIONS), bobot: b.bobot })),
      )
      // Diubah ke skala 1–4 supaya aspek dengan jumlah kriteria berbeda sebanding.
      return rata === null ? null : (rata * 4) / sec.maxScore
    })

    const total = beku
      ? beku.totalScore
      : AG_SECTIONS.slice(0, applicable).reduce((a, sec) => {
          const r = rataTertimbang(
            berbobot.map((b) => ({ nilai: calcSectionRaw(b.scores, sec.id, AG_SECTIONS), bobot: b.bobot })),
          )
          return a + (r ?? 0)
        }, 0)

    return {
      periodId: p.id,
      label: p.label,
      pendek: shortLabel(p.year, p.month),
      status: p.status,
      persen: (total / maks) * 100,
      total,
      maks,
      aspek,
      jumlahPenilai: rows.length,
      catatan: rows
        .map((r) => ({ penilai: r.evaluator.name, teks: pecahCatatan(r.catatan) }))
        .filter((c) => c.teks),
      finalCatatan: beku?.finalCatatan ?? null,
      dibekukan: !!beku,
    }
  })

  return {
    id: emp.id,
    nama: emp.name,
    role: emp.role,
    divisi: emp.divisi,
    lembaga: emp.lembaga,
    rubricType,
    aspekDipakai: AG_SECTIONS.slice(0, applicable).map((s) => ({
      id: s.id, label: s.label.replace(/^[A-G]\. /, ""), maxScore: s.maxScore,
    })),
    tren,
  }
}
