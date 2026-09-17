import { prisma } from "./prisma"
import { parseScores } from "./calculations"
import {
  monthLabel, periodIdFor, defaultWindow, isPeriodStatus, PERIOD_STATUS,
  statusMenurutJadwal, bulanWIB, type PeriodStatus,
} from "./period-format"
import { sinkronkanJadwal } from "./period-schedule"
import { isLembaga } from "./lembaga"

export * from "./period-format"

export type PeriodInfo = {
  id: string
  lembaga: string
  year: number
  month: number
  label: string
  status: PeriodStatus
  opensAt: Date
  closesAt: Date
  publishedAt: Date | null
  dapatDinilai: boolean
  /** Sisa hari sampai penutupan. Negatif berarti sudah lewat. */
  sisaHari: number | null
}

function toInfo(p: {
  id: string; lembaga: string; year: number; month: number; label: string
  status: string; opensAt: Date; closesAt: Date; publishedAt: Date | null
}): PeriodInfo {
  const status: PeriodStatus = isPeriodStatus(p.status) ? p.status : "draf"
  const msPerHari = 24 * 60 * 60 * 1000
  const sisaHari =
    status === "dibuka"
      ? Math.ceil((p.closesAt.getTime() - Date.now()) / msPerHari)
      : null
  return {
    id: p.id, lembaga: p.lembaga, year: p.year, month: p.month, label: p.label,
    status, opensAt: p.opensAt, closesAt: p.closesAt, publishedAt: p.publishedAt,
    dapatDinilai: PERIOD_STATUS[status].dapatDinilai,
    sisaHari,
  }
}

/**
 * Membuat periode bila belum ada. Tidak mengubah yang sudah ada.
 * Tanpa status eksplisit, status mengikuti jadwal — bukan selalu "dibuka".
 */
export async function ensurePeriod(
  lembaga: string,
  year: number,
  month: number,
  statusEksplisit?: PeriodStatus,
): Promise<PeriodInfo> {
  const id = periodIdFor(lembaga, year, month)
  const win = defaultWindow(year, month)
  const status = statusEksplisit ?? statusMenurutJadwal(win.opensAt, win.closesAt)
  const row = await prisma.period.upsert({
    where: { id },
    update: {},
    create: {
      id, lembaga, year, month,
      label: monthLabel(year, month),
      status,
      opensAt: win.opensAt,
      closesAt: win.closesAt,
    },
  })
  return toInfo(row)
}

export async function listPeriods(lembaga: string): Promise<PeriodInfo[]> {
  const rows = await prisma.period.findMany({
    where: { lembaga },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })
  return rows.map(toInfo)
}

export async function getPeriod(id: string): Promise<PeriodInfo | null> {
  const row = await prisma.period.findUnique({ where: { id } })
  return row ? toInfo(row) : null
}

/**
 * Periode aktif sebuah lembaga: yang berstatus "dibuka". Bila ada lebih dari
 * satu, ambil yang terbaru. Bila tidak ada sama sekali, ambil periode terakhir
 * apa pun statusnya, supaya dashboard tetap menampilkan sesuatu.
 */
export async function getActivePeriod(lembaga: string): Promise<PeriodInfo | null> {
  const dibuka = await prisma.period.findFirst({
    where: { lembaga, status: "dibuka" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })
  if (dibuka) return toInfo(dibuka)

  const terakhir = await prisma.period.findFirst({
    where: { lembaga },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })
  return terakhir ? toInfo(terakhir) : null
}

/**
 * Menentukan periode yang sedang dilihat. Pilihan dari URL menang, asalkan
 * periode itu memang milik lembaga yang sedang dibuka; kalau tidak, jatuh ke
 * periode aktif.
 *
 * Sebelum itu jadwal ditegakkan lebih dulu: periode bulan berjalan dipastikan
 * ada dan statusnya benar. Dengan begitu, siklus bulanan tidak bergantung
 * sepenuhnya pada cron.
 */
export async function resolvePeriod(
  lembaga: string,
  requestedId?: string | null,
): Promise<PeriodInfo> {
  if (isLembaga(lembaga)) {
    try {
      await sinkronkanJadwal([lembaga])
    } catch (e) {
      // Kegagalan menegakkan jadwal tidak boleh membuat halaman ikut gagal.
      console.error("[periode] sinkronisasi jadwal gagal:", e)
    }
  }

  if (requestedId) {
    const p = await getPeriod(requestedId)
    if (p && p.lembaga === lembaga) return p
  }
  const aktif = await getActivePeriod(lembaga)
  if (aktif) return aktif

  const { year, month } = bulanWIB()
  return ensurePeriod(lembaga, year, month)
}

/**
 * Nilai periode sebelumnya, untuk ditampilkan sebagai bayangan di samping
 * setiap kriteria.
 *
 * Sengaja TIDAK dipakai sebagai isian awal. Mengisi otomatis dengan nilai
 * bulan lalu memang menghemat waktu penilai, tapi menghabiskan nilai dari
 * datanya: yang terjadi kemudian adalah angka yang tidak pernah bergerak
 * selama setahun. Satu-satunya alasan menilai tiap bulan adalah kalau
 * angkanya boleh berubah tiap bulan.
 *
 * Yang ditampilkan adalah nilai yang diberikan penilai itu sendiri bulan lalu,
 * bukan rata-rata semua orang — rujukan yang berguna adalah "bulan lalu saya
 * memberi berapa", supaya penilai bisa menjaga konsistensi ukurannya sendiri.
 */
export async function previousPeriodScores(
  period: { lembaga: string; year: number; month: number },
  employeeIds: string[],
  evaluatorId?: string,
): Promise<{
  periodId: string | null
  label: string | null
  byEmployee: Record<string, Record<string, number>>
}> {
  const kosong = { periodId: null, label: null, byEmployee: {} }
  if (employeeIds.length === 0) return kosong

  const urutanSekarang = period.year * 12 + period.month

  // Periode terdekat sebelum periode ini yang punya penilaian terkirim.
  const kandidat = await prisma.period.findMany({
    where: { lembaga: period.lembaga },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { id: true, label: true, year: true, month: true },
  })
  const sebelumnya = kandidat.find((p) => p.year * 12 + p.month < urutanSekarang)
  if (!sebelumnya) return kosong

  const rows = await prisma.evaluation.findMany({
    where: {
      periodId: sebelumnya.id,
      employeeId: { in: employeeIds },
      status: "terkirim",
      ...(evaluatorId ? { evaluatorId } : {}),
    },
    select: { employeeId: true, scores: true },
  })
  if (rows.length === 0) return kosong

  // Bila satu orang dinilai beberapa penilai, ambil rata-ratanya per kriteria.
  const terkumpul = new Map<string, Map<string, number[]>>()
  for (const r of rows) {
    if (!terkumpul.has(r.employeeId)) terkumpul.set(r.employeeId, new Map())
    const perKriteria = terkumpul.get(r.employeeId)!
    for (const [id, nilai] of Object.entries(parseScores(r.scores))) {
      if (typeof nilai !== "number" || nilai <= 0) continue
      if (!perKriteria.has(id)) perKriteria.set(id, [])
      perKriteria.get(id)!.push(nilai)
    }
  }

  const byEmployee: Record<string, Record<string, number>> = {}
  for (const [empId, perKriteria] of terkumpul) {
    const hasil: Record<string, number> = {}
    for (const [id, nilai] of perKriteria) {
      hasil[id] = nilai.reduce((a, b) => a + b, 0) / nilai.length
    }
    byEmployee[empId] = hasil
  }

  return { periodId: sebelumnya.id, label: sebelumnya.label, byEmployee }
}
