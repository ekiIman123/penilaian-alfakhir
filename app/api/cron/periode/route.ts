import { NextResponse } from "next/server"
import { LEMBAGA_SLUGS } from "@/lib/lembaga"
import { sinkronkanJadwal } from "@/lib/period-schedule"

export const dynamic = "force-dynamic"

/**
 * Menjalankan ritme bulanan tanpa perlu ada yang mengingat.
 *
 * Seluruh aturannya ada di lib/period-schedule.ts, yang juga dijalankan saat
 * halaman dibuka — jadi cron ini adalah jaring pengaman, bukan satu-satunya
 * penggerak. Kalau cron Vercel terlewat sehari, siklus tetap berjalan.
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
  const tindakan = await sinkronkanJadwal(LEMBAGA_SLUGS, { now, paksa: true })

  return NextResponse.json({
    dijalankan: now.toISOString(),
    tindakan: tindakan.length > 0 ? tindakan : ["tidak ada yang perlu dilakukan"],
  })
}
