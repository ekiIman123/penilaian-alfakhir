import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Check if "default" record still exists
  const old = await prisma.orgSettings.findUnique({ where: { id: "default" } })
  if (old) {
    // Create new record with id "alfakhir" copying all data
    const { id, ...rest } = old
    await prisma.orgSettings.upsert({
      where: { id: "alfakhir" },
      create: { id: "alfakhir", ...rest, lembaga: "alfakhir" },
      update: { lembaga: "alfakhir" },
    })
    // Delete old "default" record
    await prisma.orgSettings.delete({ where: { id: "default" } })
    console.log("Migrated OrgSettings from id:'default' to id:'alfakhir'")
  } else {
    // Ensure alfakhir record exists
    await prisma.orgSettings.upsert({
      where: { id: "alfakhir" },
      create: { id: "alfakhir", lembaga: "alfakhir" },
      update: { lembaga: "alfakhir" },
    })
    console.log("OrgSettings already migrated or was already 'alfakhir'")
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
