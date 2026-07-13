import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const VALID_IDS = ["alfakhir", "iysa", "icgi", "iyora"]

export async function GET(req: Request) {
  const url = new URL(req.url)
  const param = url.searchParams.get("lembaga") ?? "alfakhir"
  const lembagaId = VALID_IDS.includes(param) ? param : "alfakhir"

  const settings = await prisma.orgSettings.findUnique({ where: { id: lembagaId } })

  if (!settings?.logoBase64) {
    return new NextResponse(null, { status: 404 })
  }

  const match = settings.logoBase64.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return new NextResponse(null, { status: 404 })
  }

  const [, mimeType, base64Data] = match
  const buffer = Buffer.from(base64Data, "base64")

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}
