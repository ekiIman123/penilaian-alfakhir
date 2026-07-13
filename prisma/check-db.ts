import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const [teachers, evaluators, evaluations, settings] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
    prisma.evaluator.findMany({ orderBy: { name: "asc" } }),
    prisma.evaluation.findMany(),
    prisma.orgSettings.findMany(),
  ])

  console.log(`\n=== TEACHERS (${teachers.length}) ===`)
  teachers.forEach(t => console.log(` - [${t.role}] ${t.name}`))

  console.log(`\n=== EVALUATORS (${evaluators.length}) ===`)
  evaluators.forEach(e => console.log(` - ${e.name}`))

  console.log(`\n=== EVALUATIONS (${evaluations.length}) ===`)
  evaluations.forEach(ev => console.log(` - evaluatorId:${ev.evaluatorId} → employeeId:${ev.employeeId}`))

  console.log(`\n=== ORG SETTINGS (${settings.length}) ===`)
  settings.forEach(s => console.log(` - id:${s.id} | yayasan:${s.yayasanName} | school:${s.schoolName}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
