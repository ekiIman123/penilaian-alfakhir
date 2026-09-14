import { prisma } from "./prisma"
import { AG_SECTIONS, getNewRubricGrade } from "./rubrics"
import { calcSectionRaw, parseScores } from "./calculations"
import { rubricTypeFor } from "./lembaga-evaluatees"
import { bobotUntukPeran, rataTertimbang } from "./weights"
import { LEMBAGA_SLUGS, type LembagaSlug } from "./lembaga"
import { shortLabel } from "./period-format"

export type SelPeta = {
  periodId: string
  label: string
  pendek: string
  status: string
  /** Nilai rata-rata lembaga dalam persen dari nilai maksimal. */
  persen: number | null
  jumlahOrang: number
  dinilai: number
}

export type BarisPeta = {
  lembaga: LembagaSlug
  label: string
  sel: SelPeta[]
}

export type Perhatian = {
  lembaga: LembagaSlug
  employeeId: string
  nama: string
  role: string
  divisi: string | null
  jenis: "turun" | "rendah" | "belum" | "sendirian"
  pesan: string
  persen: number | null
  selisih: number | null
}

/** Nilai satu orang pada satu periode, dalam persen dari maksimal rubriknya. */
async function persenPerOrang(periodIds: string[]) {
  if (periodIds.length === 0) return new Map<string, Map<string, number>>()

  const evals = await prisma.evaluation.findMany({
    where: { periodId: { in: periodIds }, status: "terkirim" },
    select: { periodId: true, employeeId: true, evaluatorId: true, scores: true },
  })
  if (evals.length === 0) return new Map<string, Map<string, number>>()

  const employeeIds = [...new Set(evals.map((e) => e.employeeId))]
  const evaluatorIds = [...new Set(evals.map((e) => e.evaluatorId))]

  const [employees, evaluators, penugasan] = await Promise.all([
    prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, role: true } }),
    prisma.evaluator.findMany({ where: { id: { in: evaluatorIds } }, select: { id: true, role: true } }),
    prisma.assignment.findMany({
      where: { evaluatorId: { in: evaluatorIds }, employeeId: { in: employeeIds } },
      select: { evaluatorId: true, employeeId: true, weight: true },
    }),
  ])

  const peranKaryawan = new Map(employees.map((e) => [e.id, e.role]))
  const peranPenilai = new Map(evaluators.map((e) => [e.id, e.role]))
  const bobotKhusus = new Map(penugasan.map((a) => [`${a.evaluatorId}:${a.employeeId}`, a.weight]))

  // periodId → employeeId → persen
  const kumpul = new Map<string, Map<string, { nilai: number; bobot: number }[]>>()
  for (const ev of evals) {
    const role = peranKaryawan.get(ev.employeeId) ?? "staff"
    const rubricType = rubricTypeFor(role)
    const applicable = rubricType === "ae" ? 5 : 7
    const maks = rubricType === "ae" ? 60 : 84

    const scores = parseScores(ev.scores)
    const total = AG_SECTIONS.slice(0, applicable).reduce(
      (a, sec) => a + calcSectionRaw(scores, sec.id, AG_SECTIONS), 0,
    )

    const bobot =
      bobotKhusus.get(`${ev.evaluatorId}:${ev.employeeId}`) ??
      bobotUntukPeran(peranPenilai.get(ev.evaluatorId) ?? "")

    if (!kumpul.has(ev.periodId)) kumpul.set(ev.periodId, new Map())
    const perPeriode = kumpul.get(ev.periodId)!
    if (!perPeriode.has(ev.employeeId)) perPeriode.set(ev.employeeId, [])
    perPeriode.get(ev.employeeId)!.push({ nilai: (total / maks) * 100, bobot })
  }

  const hasil = new Map<string, Map<string, number>>()
  for (const [periodId, perOrang] of kumpul) {
    const m = new Map<string, number>()
    for (const [empId, nilai] of perOrang) {
      const rata = rataTertimbang(nilai)
      if (rata !== null) m.set(empId, rata)
    }
    hasil.set(periodId, m)
  }
  return hasil
}

/**
 * Peta lintas lembaga: tiga lembaga × beberapa bulan terakhir.
 *
 * Layar pertama manajemen seharusnya peta, bukan daftar tugas. Pak Deni dan
 * Bu Anggraini hanya menilai enam pemimpin, tapi memantau dua puluh enam orang.
 */
export async function bangunPeta(bulanTerakhir = 6): Promise<BarisPeta[]> {
  const periods = await prisma.period.findMany({
    where: { lembaga: { in: [...LEMBAGA_SLUGS] } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })

  // Bulan yang ditampilkan: gabungan bulan terbaru dari ketiga lembaga.
  const kunciBulan = [...new Set(periods.map((p) => `${p.year}-${String(p.month).padStart(2, "0")}`))]
    .sort()
    .slice(-bulanTerakhir)

  const dipakai = periods.filter((p) =>
    kunciBulan.includes(`${p.year}-${String(p.month).padStart(2, "0")}`),
  )

  const [persen, jumlahOrang] = await Promise.all([
    persenPerOrang(dipakai.map((p) => p.id)),
    prisma.employee.groupBy({
      by: ["lembaga"],
      where: { lembaga: { in: [...LEMBAGA_SLUGS] } },
      _count: { _all: true },
    }),
  ])
  const orangPerLembaga = new Map(jumlahOrang.map((g) => [g.lembaga, g._count._all]))

  return LEMBAGA_SLUGS.map((lembaga) => ({
    lembaga,
    label: lembaga.toUpperCase(),
    sel: kunciBulan.map((kunci) => {
      const [y, m] = kunci.split("-").map(Number)
      const p = dipakai.find((x) => x.lembaga === lembaga && x.year === y && x.month === m)
      if (!p) {
        return {
          periodId: "", label: `${shortLabel(y, m)}`, pendek: shortLabel(y, m),
          status: "tidak ada", persen: null, jumlahOrang: 0, dinilai: 0,
        }
      }
      const nilai = [...(persen.get(p.id)?.values() ?? [])]
      return {
        periodId: p.id,
        label: p.label,
        pendek: shortLabel(p.year, p.month),
        status: p.status,
        persen: nilai.length > 0 ? nilai.reduce((a, b) => a + b, 0) / nilai.length : null,
        jumlahOrang: orangPerLembaga.get(lembaga) ?? 0,
        dinilai: nilai.length,
      }
    }),
  }))
}

/**
 * Baris yang perlu perhatian pada periode berjalan.
 *
 * Disaring otomatis supaya manajemen tidak perlu membaca dua puluh enam baris
 * untuk menemukan yang penting.
 */
export async function baganPerhatian(ambangTurun = 15): Promise<Perhatian[]> {
  const out: Perhatian[] = []

  for (const lembaga of LEMBAGA_SLUGS) {
    const periods = await prisma.period.findMany({
      where: { lembaga },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 2,
    })
    if (periods.length === 0) continue

    const kini = periods[0]
    const lalu = periods[1]

    const [employees, persen] = await Promise.all([
      prisma.employee.findMany({
        where: { lembaga },
        select: { id: true, name: true, role: true, divisi: true },
      }),
      persenPerOrang([kini.id, ...(lalu ? [lalu.id] : [])]),
    ])

    const kiniMap = persen.get(kini.id) ?? new Map()
    const laluMap = lalu ? persen.get(lalu.id) ?? new Map() : new Map()

    // Berapa penilai yang sudah mengirim per orang, untuk mendeteksi yang
    // hanya dinilai satu orang — satu sudut pandang saja itu rapuh.
    const jumlahPenilai = await prisma.evaluation.groupBy({
      by: ["employeeId"],
      where: { periodId: kini.id, status: "terkirim" },
      _count: { _all: true },
    })
    const penilaiPer = new Map(jumlahPenilai.map((g) => [g.employeeId, g._count._all]))

    for (const emp of employees) {
      const sekarang = kiniMap.get(emp.id) ?? null
      const sebelum = laluMap.get(emp.id) ?? null

      if (sekarang === null) {
        if (kini.status === "dibuka" || kini.status === "ditutup") {
          out.push({
            lembaga, employeeId: emp.id, nama: emp.name, role: emp.role, divisi: emp.divisi,
            jenis: "belum",
            pesan: `Belum ada penilaian masuk untuk ${kini.label}`,
            persen: null, selisih: null,
          })
        }
        continue
      }

      if (sebelum !== null && sebelum - sekarang >= ambangTurun) {
        out.push({
          lembaga, employeeId: emp.id, nama: emp.name, role: emp.role, divisi: emp.divisi,
          jenis: "turun",
          pesan: `Turun ${Math.round(sebelum - sekarang)} poin dari ${lalu!.label}`,
          persen: sekarang, selisih: sekarang - sebelum,
        })
        continue
      }

      if (sekarang < 56) {
        out.push({
          lembaga, employeeId: emp.id, nama: emp.name, role: emp.role, divisi: emp.divisi,
          jenis: "rendah",
          pesan: `Nilai ${Math.round(sekarang)}% — ${getNewRubricGrade(sekarang, "ae").label.toLowerCase()}`,
          persen: sekarang, selisih: sebelum !== null ? sekarang - sebelum : null,
        })
        continue
      }

      if ((penilaiPer.get(emp.id) ?? 0) === 1 && emp.role === "staff") {
        out.push({
          lembaga, employeeId: emp.id, nama: emp.name, role: emp.role, divisi: emp.divisi,
          jenis: "sendirian",
          pesan: "Hanya dinilai satu orang — satu sudut pandang saja",
          persen: sekarang, selisih: null,
        })
      }
    }
  }

  const urutan = { turun: 0, rendah: 1, belum: 2, sendirian: 3 }
  return out.sort((a, b) => urutan[a.jenis] - urutan[b.jenis] || a.nama.localeCompare(b.nama))
}
