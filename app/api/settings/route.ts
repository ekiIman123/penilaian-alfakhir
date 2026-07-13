import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const DEFAULT_ID = "alfakhir"

export async function GET() {
  const settings = await prisma.orgSettings.upsert({
    where: { id: DEFAULT_ID },
    create: { id: DEFAULT_ID },
    update: {},
  })
  return NextResponse.json(settings)
}

export const dynamic = "force-dynamic"

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const allowed = [
      "yayasanName", "schoolName", "address", "phone", "city",
      "periodLabel", "kepalaSekolah", "kepalaTitle", "kepalaSignatureBase64",
      "signer2Name", "signer2Title", "signer2SignatureBase64",
      "ketuaName", "ketuaTitle", "ketuaSignatureBase64", "logoBase64",
    ]
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }
    await prisma.orgSettings.upsert({
      where: { id: DEFAULT_ID },
      create: { id: DEFAULT_ID, ...data },
      update: data,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PUT /api/settings]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
