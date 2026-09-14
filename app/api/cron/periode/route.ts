import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { LEMBAGA_SLUGS } from "@/lib/lembaga"
import { periodIdFor, monthLabel, defaultWindow } from "@/lib/period-format"
import { catatAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"

/**
 * Menjalankan ritme bulanan tanpa perlu ada yang mengingat.
 *
 * Dijadwalkan harian. Setiap hari ia memeriksa dua hal:
 *   1. Apakah sudah waktunya periode bulan ini dibuka (tanggal 25)?
 *   2. Apakah ada periode yang sudah lewat tenggat tapi masih terbuka?
 *
 * Yang sengaja TIDAK dilakukan otomatis: menerbitkan rapor. Penerbitan
 * membekukan angka secara permanen dan mendahului kalibrasi — itu keputusan
 * manusia, bukan jadwal.
 */
export async function GET(req: Request) {
  // Vercel Cron mengirim header Authorization berisi CRON_SECRET.
  const rahasia = process.env.CRON_SECRET
  if (rahasia) {
    const dikirim = req.headers.get("authorization")
    if (dikirim !== `Bearer ${rahasia}`) {
      return NextResponse.json({ error: "Tidak punya akses" }, { status: 401 })
    }
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const tindakan: string[] = []

  for (const lembaga of LEMBAGA_SLUGS) {
    const id = periodIdFor(lembaga, year, month)
    const win = defaultWindow(year, month)

    // ── 1. Periode bulan berjalan ──────────────────────────────────────
    const ada = await prisma.period.findUnique({ where: { id } })

    if (!ada) {
      // Dibuat sebagai draf dulu; baru dibuka saat jendelanya tiba.
      await prisma.period.create({
        data: {
          id, lembaga, year, month,
          label: monthLabel(year, month),
          status: now >= win.opensAt ? "dibuka" : "draf",
          opensAt: win.opensAt,
          closesAt: win.closesAt,
        },
      })
      tindakan.push(`${id} dibuat${now >= win.opensAt ? " dan dibuka" : " sebagai draf"}`)
    } else if (ada.status === "draf" && now >= ada.opensAt) {
      await prisma.period.update({ where: { id }, data: { status: "dibuka" } })
      await catatAudit({
        actorId: "sistem", actorName: "Sistem",
        action: "periode.buka", target: id, lembaga,
        detail: `Periode ${ada.label} dibuka otomatis sesuai jadwal`,
      })
      tindakan.push(`${id} dibuka otomatis`)
    }

    // ── 2. Periode yang sudah lewat tenggat ────────────────────────────
    const lewat = await prisma.period.findMany({
      where: { lembaga, status: "dibuka", closesAt: { lt: now } },
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

  return NextResponse.json({
    dijalankan: now.toISOString(),
    tindakan: tindakan.length > 0 ? tindakan : ["tidak ada yang perlu dilakukan"],
  })
}
