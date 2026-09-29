import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const VALID_IDS = ["alfakhir", "iysa", "icgi", "iyora"]

/**
 * Logo dipasang di navbar, jadi ikut terambil pada setiap perpindahan halaman.
 * Karena itu jawabannya harus boleh disimpan browser — termasuk saat logonya
 * belum ada.
 *
 * Jawaban 404 yang tidak di-cache adalah jebakan yang halus: lembaga yang
 * belum mengunggah logo justru membayar satu perjalanan ke server di setiap
 * halaman, selamanya, untuk mendapat kabar "tidak ada" yang sama.
 *
 * Tenggangnya sengaja pendek (10 menit terpasang, 2 menit untuk yang belum
 * ada) supaya logo yang baru diunggah lekas terlihat tanpa menunggu lama.
 */
const CACHE_ADA = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400"
const CACHE_BELUM_ADA = "public, max-age=120"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const param = url.searchParams.get("lembaga") ?? "alfakhir"
  const lembagaId = VALID_IDS.includes(param) ? param : "alfakhir"

  const settings = await prisma.orgSettings.findUnique({
    where: { id: lembagaId },
    select: { logoBase64: true },
  })

  const match = settings?.logoBase64?.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": CACHE_BELUM_ADA },
    })
  }

  const [, mimeType, base64Data] = match
  const buffer = Buffer.from(base64Data, "base64")

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": CACHE_ADA,
    },
  })
}
