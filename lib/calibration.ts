import { prisma } from "./prisma"
import { AG_SECTIONS } from "./rubrics"
import { calcSectionRaw, parseScores } from "./calculations"
import { rubricTypeFor } from "./lembaga-evaluatees"
import { bobotUntukPeran, rataTertimbang } from "./weights"
import { NILAI_EKSTREM } from "./eval-rules"
import type { PeriodInfo } from "./periods"

export type PitaNilai = { label: string; batas: string; jumlah: number; warna: string; bg: string }

export type CerminPenilai = {
  evaluatorId: string
  nama: string
  role: string
  jumlahDinilai: number
  /** Rata-rata butir 1–4 yang diberikan penilai ini. */
  rataButir: number
  /** Selisih terhadap rata-rata seluruh penilai di lembaga ini. */
  selisih: number
  /** Sebaran: berapa persen nilai menumpuk di satu angka. */
  menumpukDi: number | null
  menumpukPersen: number
  /** Berapa persen nilainya ekstrem (1, 2, atau 4). */
  ekstremPersen: number
  /** Berapa orang yang ia beri nilai identik di semua kriteria. */
  seragam: number
}

export type BarisKalibrasi = {
  employeeId: string
  nama: string
  role: string
  divisi: string | null
  persen: number
  total: number
  maks: number
  jumlahPenilai: number
  /** Selisih terbesar antar penilai untuk orang ini, dalam persen. */
  rentang: number | null
}

export type DataKalibrasi = {
  pita: PitaNilai[]
  penilai: CerminPenilai[]
  orang: BarisKalibrasi[]
  rataLembaga: number | null
  jumlahDinilai: number
  jumlahOrang: number
}

const PITA = [
  { label: "Sangat Baik",     min: 86, warna: "#14532D", bg: "#BBF7D0" },
  { label: "Baik",            min: 71, warna: "#1E3A8A", bg: "#BFDBFE" },
  { label: "Cukup",           min: 56, warna: "#78350F", bg: "#FDE68A" },
  { label: "Perlu Perbaikan", min: 0,  warna: "#991B1B", bg: "#FECACA" },
]

/**
 * Bahan untuk rapat kalibrasi bulanan.
 *
 * Dua pertanyaan yang selalu muncul: apakah sebaran nilainya masuk akal, dan
 * apakah ada penilai yang ukurannya jauh berbeda dari yang lain. Keduanya
 * tidak terlihat dari daftar nilai per orang.
 */
export async function dataKalibrasi(
  lembaga: string,
  period: PeriodInfo,
): Promise<DataKalibrasi> {
  const [employees, evals] = await Promise.all([
    prisma.employee.findMany({
      where: { lembaga },
      select: { id: true, name: true, role: true, divisi: true },
    }),
    prisma.evaluation.findMany({
      where: { periodId: period.id, status: "terkirim" },
      select: {
        employeeId: true, evaluatorId: true, scores: true,
        evaluator: { select: { name: true, role: true } },
      },
    }),
  ])

  const penugasan = await prisma.assignment.findMany({
    where: { lembaga },
    select: { evaluatorId: true, employeeId: true, weight: true },
  })
  const bobotKhusus = new Map(penugasan.map((a) => [`${a.evaluatorId}:${a.employeeId}`, a.weight]))
  const peranKaryawan = new Map(employees.map((e) => [e.id, e.role]))

  function persenSatuPenilaian(employeeId: string, scoresRaw: string): number {
    const rubricType = rubricTypeFor(peranKaryawan.get(employeeId) ?? "staff")
    const applicable = rubricType === "ae" ? 5 : 7
    const maks = rubricType === "ae" ? 60 : 84
    const scores = parseScores(scoresRaw)
    const total = AG_SECTIONS.slice(0, applicable)
      .reduce((a, sec) => a + calcSectionRaw(scores, sec.id, AG_SECTIONS), 0)
    return (total / maks) * 100
  }

  // ── Nilai akhir per orang ────────────────────────────────────────────
  const orang: BarisKalibrasi[] = []
  for (const emp of employees) {
    const rows = evals.filter((e) => e.employeeId === emp.id)
    if (rows.length === 0) continue

    const rubricType = rubricTypeFor(emp.role)
    const applicable = rubricType === "ae" ? 5 : 7
    const maks = rubricType === "ae" ? 60 : 84

    const berbobot = rows.map((r) => ({
      scores: parseScores(r.scores),
      bobot: bobotKhusus.get(`${r.evaluatorId}:${emp.id}`) ?? bobotUntukPeran(r.evaluator.role),
    }))

    const total = AG_SECTIONS.slice(0, applicable).reduce((a, sec) => {
      const r = rataTertimbang(
        berbobot.map((b) => ({ nilai: calcSectionRaw(b.scores, sec.id, AG_SECTIONS), bobot: b.bobot })),
      )
      return a + (r ?? 0)
    }, 0)

    const perPenilai = rows.map((r) => persenSatuPenilaian(emp.id, r.scores))
    const rentang = perPenilai.length > 1 ? Math.max(...perPenilai) - Math.min(...perPenilai) : null

    orang.push({
      employeeId: emp.id,
      nama: emp.name,
      role: emp.role,
      divisi: emp.divisi,
      persen: (total / maks) * 100,
      total,
      maks,
      jumlahPenilai: rows.length,
      rentang,
    })
  }
  orang.sort((a, b) => b.persen - a.persen)

  // ── Sebaran ──────────────────────────────────────────────────────────
  const pita: PitaNilai[] = PITA.map((p, i) => {
    const atas = i === 0 ? 100 : PITA[i - 1].min
    return {
      label: p.label,
      batas: i === 0 ? `≥ ${p.min}%` : `${p.min}–${atas - 1}%`,
      jumlah: orang.filter((o) => o.persen >= p.min && (i === 0 || o.persen < atas)).length,
      warna: p.warna,
      bg: p.bg,
    }
  })

  // ── Cermin penilai ───────────────────────────────────────────────────
  const perPenilai = new Map<string, typeof evals>()
  for (const e of evals) {
    if (!perPenilai.has(e.evaluatorId)) perPenilai.set(e.evaluatorId, [])
    perPenilai.get(e.evaluatorId)!.push(e)
  }

  const semuaButir: number[] = []
  for (const e of evals) {
    semuaButir.push(...Object.values(parseScores(e.scores)).filter((n) => n > 0))
  }
  const rataSemua = semuaButir.length > 0
    ? semuaButir.reduce((a, b) => a + b, 0) / semuaButir.length
    : 0

  const penilai: CerminPenilai[] = [...perPenilai.entries()].map(([id, rows]) => {
    const butir: number[] = []
    let seragam = 0
    for (const r of rows) {
      const nilai = Object.values(parseScores(r.scores)).filter((n) => n > 0)
      butir.push(...nilai)
      if (nilai.length > 0 && new Set(nilai).size === 1) seragam++
    }

    const hitung = new Map<number, number>()
    for (const n of butir) hitung.set(n, (hitung.get(n) ?? 0) + 1)
    let terbanyak: number | null = null
    let jumlahTerbanyak = 0
    for (const [n, j] of hitung) if (j > jumlahTerbanyak) { terbanyak = n; jumlahTerbanyak = j }

    const rataButir = butir.length > 0 ? butir.reduce((a, b) => a + b, 0) / butir.length : 0

    return {
      evaluatorId: id,
      nama: rows[0].evaluator.name,
      role: rows[0].evaluator.role,
      jumlahDinilai: rows.length,
      rataButir,
      selisih: rataButir - rataSemua,
      menumpukDi: butir.length > 0 && jumlahTerbanyak / butir.length > 0.6 ? terbanyak : null,
      menumpukPersen: butir.length > 0 ? Math.round((jumlahTerbanyak / butir.length) * 100) : 0,
      ekstremPersen: butir.length > 0
        ? Math.round((butir.filter((n) => NILAI_EKSTREM.includes(n)).length / butir.length) * 100)
        : 0,
      seragam,
    }
  }).sort((a, b) => Math.abs(b.selisih) - Math.abs(a.selisih))

  return {
    pita,
    penilai,
    orang,
    rataLembaga: orang.length > 0 ? orang.reduce((a, b) => a + b.persen, 0) / orang.length : null,
    jumlahDinilai: orang.length,
    jumlahOrang: employees.length,
  }
}
