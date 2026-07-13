import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Ganti ACCESS_CODE sesuai keinginan sebelum menjalankan script ini
  const ACCESS_CODE = "GM-2025"

  const founder = await prisma.evaluator.upsert({
    where: { accessCode: ACCESS_CODE },
    create: {
      name: "General Manager",
      lembaga: "all",
      role: "founder",
      accessCode: ACCESS_CODE,
    },
    update: {
      name: "General Manager",
      lembaga: "all",
      role: "founder",
    },
  })

  console.log(`✓ Founder evaluator created/updated: ${founder.name} | code: ${ACCESS_CODE}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
