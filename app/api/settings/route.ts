import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const DEFAULT_ID = "default"

export async function GET() {
  const settings = await prisma.orgSettings.upsert({
    where: { id: DEFAULT_ID },
    create: { id: DEFAULT_ID },
    update: {},
  })
  return NextResponse.json(settings)
}

export async function PUT(req: Request) {
  const body = await req.json()
  const allowed = [
    "yayasanName", "schoolName", "address", "phone", "city",
    "periodLabel", "kepalaSekolah", "ketuaName", "ketuaTitle", "logoBase64",
  ]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }
  const settings = await prisma.orgSettings.upsert({
    where: { id: DEFAULT_ID },
    create: { id: DEFAULT_ID, ...data },
    update: data,
  })
  return NextResponse.json(settings)
}
