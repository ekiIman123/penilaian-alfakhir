import { prisma } from "./prisma"
import { LEMBAGA_SLUGS } from "./lembaga"
import { catatAudit } from "./audit"
import {
  periodIdFor, monthLabel, defaultWindow, bulanWIB, statusMenurutJadwal,
} from "./period-format"

/**
 * Satu-satunya tempat jadwal periode ditegakkan.
 *
 * Sebelumnya periode bulan berjalan bisa lahir dari dua jalur yang tidak
 * sepakat: cron harian membuatnya sebagai "draf", sedangkan dashboard
 * membuatnya sebagai "dibuka". Hasilnya bergantung pada siapa yang lebih dulu —
 * di produksi, IYSA terbuka sementara ICGI dan IYORA terkunci pada bulan yang
 * sama.
 *
 * Sekarang keduanya memanggil fungsi ini. Cron menjalankannya tiap hari, dan
 * halaman menjalankannya saat dibuka, sehingga siklus bulanan tetap berjalan
 * meskipun cron Vercel terlewat.
 *
 * Aturannya:
 *   - Periode bulan berjalan selalu ada, dengan status sesuai jadwal.
 *   - Periode "draf" dibuka saat jadwalnya tiba — kecuali manusia sengaja
 *     mengembalikannya ke draf. Keputusan manusia menang atas jadwal.
 *   - Periode "dibuka" ditutup saat tenggatnya lewat. Manusia yang ingin
 *     memperpanjang cukup "Buka kembali", yang menggeser tenggatnya.
 *   - Rapor tidak pernah diterbitkan otomatis.
 */

/** Tindakan manusia yang menyatakan kehendak atas status sebuah periode. */
const AKSI_STATUS = ["periode.draf", "periode.buka", "periode.buka-kembali", "periode.tutup"]

async function dikembalikanKeDrafOlehManusia(periodId: string): Promise<boolean> {
  const terakhir = await prisma.auditLog.findFirst({
    where: {
      target: periodId,
      action: { in: AKSI_STATUS },
      NOT: { actorId: "sistem" },
    },
    orderBy: { createdAt: "desc" },
    select: { action: true },
  })
  return terakhir?.action === "periode.draf"
}

/**
 * Pelindung supaya halaman yang sering dibuka tidak menjalankan pemeriksaan
 * berulang kali dalam hitungan detik. Per proses saja — cukup untuk
 * meredam beban, tanpa mengorbankan kebenaran karena cron tetap berjalan.
 */
const terakhirDisinkronkan = new Map<string, number>()
const JEDA_MS = 60_000

export async function sinkronkanJadwal(
  lembagaList: readonly string[] = LEMBAGA_SLUGS,
  opsi: { now?: Date; paksa?: boolean } = {},
): Promise<string[]> {
  const now = opsi.now ?? new Date()
  const tindakan: string[] = []

  for (const lembaga of lembagaList) {
    if (!opsi.paksa) {
      const t = terakhirDisinkronkan.get(lembaga)
      if (t && now.getTime() - t < JEDA_MS) continue
    }
    terakhirDisinkronkan.set(lembaga, now.getTime())

    // ── 1. Periode bulan berjalan harus ada ──────────────────────────────
    const { year, month } = bulanWIB(now)
    const id = periodIdFor(lembaga, year, month)
    const win = defaultWindow(year, month)

    const ada = await prisma.period.findUnique({ where: { id }, select: { id: true } })
    if (!ada) {
      const status = statusMenurutJadwal(win.opensAt, win.closesAt, now)
      try {
        await prisma.period.create({
          data: {
            id, lembaga, year, month,
            label: monthLabel(year, month),
            status,
            opensAt: win.opensAt,
            closesAt: win.closesAt,
          },
        })
        await catatAudit({
          actorId: "sistem", actorName: "Sistem",
          action: "periode.buat", target: id, lembaga,
          detail: `Periode ${monthLabel(year, month)} dibuat otomatis (${status})`,
        })
        tindakan.push(`${id} dibuat (${status})`)
      } catch {
        // Permintaan lain membuatnya pada saat yang sama — tidak apa-apa.
      }
    }

    // ── 2. Draf yang jadwalnya sudah tiba → dibuka ───────────────────────
    const siapDibuka = await prisma.period.findMany({
      where: { lembaga, status: "draf", opensAt: { lte: now }, closesAt: { gt: now } },
      select: { id: true, label: true },
    })
    for (const p of siapDibuka) {
      if (await dikembalikanKeDrafOlehManusia(p.id)) continue
      await prisma.period.update({ where: { id: p.id }, data: { status: "dibuka" } })
      await catatAudit({
        actorId: "sistem", actorName: "Sistem",
        action: "periode.buka", target: p.id, lembaga,
        detail: `Periode ${p.label} dibuka otomatis sesuai jadwal`,
      })
      tindakan.push(`${p.id} dibuka otomatis`)
    }

    // ── 3. Terbuka tapi tenggat lewat → ditutup ──────────────────────────
    const lewat = await prisma.period.findMany({
      where: { lembaga, status: "dibuka", closesAt: { lt: now } },
      select: { id: true, label: true },
    })
    for (const p of lewat) {
      const draf = await prisma.evaluation.count({ where: { periodId: p.id, status: "draf" } })
      await prisma.period.update({ where: { id: p.id }, data: { status: "ditutup" } })
      await catatAudit({
        actorId: "sistem", actorName: "Sistem",
        action: "periode.tutup", target: p.id, lembaga,
        detail:
          `Periode ${p.label} ditutup otomatis pada tenggatnya` +
          (draf > 0 ? ` — ${draf} penilaian masih draf dan tidak ikut dihitung` : ""),
      })
      tindakan.push(`${p.id} ditutup otomatis`)
    }
  }

  return tindakan
}
