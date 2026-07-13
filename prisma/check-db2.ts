import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
async function main() {
  const all = await prisma.employee.findMany({ orderBy: { name: "asc" } })
  all.forEach((t) => console.log(`${t.role.padEnd(6)} | ${t.name}`))
}
main().catch(console.error).finally(() => prisma.$disconnect())
