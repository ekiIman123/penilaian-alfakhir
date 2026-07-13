import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const settings = await prisma.orgSettings.upsert({
    where: { id: "alfakhir" },
    create: { id: "alfakhir" },
    update: {},
  })

  if (!settings.logoBase64) {
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
