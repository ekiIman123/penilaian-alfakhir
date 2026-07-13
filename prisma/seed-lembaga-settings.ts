import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Read current Alfakhir settings as the source
  const src = await prisma.orgSettings.findUnique({ where: { id: "alfakhir" } })
  if (!src) {
    console.error("Alfakhir settings not found — run the app at /alfakhir/settings first")
    return
  }

  const { id: _, updatedAt: __, ...data } = src

  // Copy to iysa, icgi, iyora
  for (const lembaga of ["iysa", "icgi", "iyora"] as const) {
    await prisma.orgSettings.upsert({
      where: { id: lembaga },
      create: { id: lembaga, ...data },
      update: data,
    })
    console.log(`✓ Settings for ${lembaga} → upserted`)
  }

  console.log("\n=== OrgSettings sekarang ===")
  const all = await prisma.orgSettings.findMany({ select: { id: true, yayasanName: true, schoolName: true, periodLabel: true } })
  all.forEach((s) => console.log(`  [${s.id}] ${s.yayasanName} | ${s.schoolName} | ${s.periodLabel}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
