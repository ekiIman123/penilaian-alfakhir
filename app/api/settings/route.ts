import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const VALID_IDS = ["alfakhir", "iysa", "icgi", "iyora"]

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("lembaga") ?? "alfakhir"
  if (!VALID_IDS.includes(id)) return NextResponse.json({ error: "Invalid lembaga" }, { status: 400 })

  const settings = await prisma.orgSettings.upsert({
    where: { id },
    create: { id },
    update: {},
  })
  return NextResponse.json(settings)
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const id = VALID_IDS.includes(body.lembagaId) ? body.lembagaId : "alfakhir"
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
      where: { id },
      create: { id, ...data },
      update: data,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PUT /api/settings]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
