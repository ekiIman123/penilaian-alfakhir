import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

type EmpSeed = { name: string; lembaga: string; role: string; divisi?: string | null }
type EvSeed = { name: string; lembaga: string; role: string; divisi?: string | null; accessCode: string }

const EMPLOYEES: EmpSeed[] = [
  // IYSA — staff
  { name: "Maulana", lembaga: "iysa", role: "staff", divisi: "Publikasi dan Promosi" },
  { name: "Bunga", lembaga: "iysa", role: "staff", divisi: "Publikasi dan Promosi" },
  { name: "Indah", lembaga: "iysa", role: "staff", divisi: "Publikasi dan Promosi" },
  { name: "Nadya", lembaga: "iysa", role: "staff", divisi: "Publikasi dan Promosi" },
  { name: "Handaka", lembaga: "iysa", role: "staff", divisi: "Publikasi dan Promosi" },
  { name: "Auli", lembaga: "iysa", role: "staff", divisi: "Publikasi dan Promosi" },
  { name: "Candini", lembaga: "iysa", role: "staff", divisi: "RnD" },
  { name: "Iqbal", lembaga: "iysa", role: "staff", divisi: "RnD" },
  { name: "Zaidan Adi Prasetya", lembaga: "iysa", role: "staff", divisi: "IT" },
  { name: "Dini J", lembaga: "iysa", role: "staff", divisi: "Administrasi" },
  { name: "Khansa", lembaga: "iysa", role: "staff", divisi: "Administrasi" },
  { name: "Cinta", lembaga: "iysa", role: "staff", divisi: "Administrasi" },
  { name: "Rafida", lembaga: "iysa", role: "staff", divisi: "Administrasi" },
  { name: "Risna", lembaga: "iysa", role: "staff", divisi: "Administrasi" },
  { name: "Umi", lembaga: "iysa", role: "staff", divisi: "Administrasi" },
  { name: "Azizah", lembaga: "iysa", role: "staff", divisi: "Administrasi" },
  // IYSA — koordinators (also evaluatees for supervisor/management)
  { name: "Zaidan", lembaga: "iysa", role: "koordinator", divisi: "Koordinator" },
  { name: "Eki", lembaga: "iysa", role: "koordinator", divisi: "Koordinator" },
  { name: "Astri", lembaga: "iysa", role: "koordinator", divisi: "Koordinator" },
  // IYSA — supervisor (evaluatee for management)
  { name: "Kamal Putra", lembaga: "iysa", role: "supervisor", divisi: null },

  // ICGI — staff
  { name: "Ayu", lembaga: "icgi", role: "staff", divisi: "Administrasi" },
  { name: "David", lembaga: "icgi", role: "staff", divisi: "Publikasi dan Promosi" },
  { name: "Dafi", lembaga: "icgi", role: "staff", divisi: "Publikasi dan Promosi" },
  { name: "Rafli", lembaga: "icgi", role: "staff", divisi: "IT" },
  // ICGI — CEO (evaluatee for management)
  { name: "Kamal Putra", lembaga: "icgi", role: "ceo", divisi: null },

  // IYORA — staff
  { name: "Shofwah", lembaga: "iyora", role: "staff", divisi: "Administrasi" },
  { name: "Leni", lembaga: "iyora", role: "staff", divisi: "Publikasi dan Promosi" },
  // IYORA — PM (evaluatee for management)
  { name: "Eki Iman", lembaga: "iyora", role: "pm", divisi: null },
]

const EVALUATORS: EvSeed[] = [
  // IYSA
  { name: "Zaidan", lembaga: "iysa", role: "koordinator", divisi: JSON.stringify(["IT", "Publikasi dan Promosi"]), accessCode: "KOR-ZAI" },
  { name: "Eki", lembaga: "iysa", role: "koordinator", divisi: JSON.stringify(["RnD"]), accessCode: "KOR-EKI" },
  { name: "Astri", lembaga: "iysa", role: "koordinator", divisi: JSON.stringify(["Administrasi"]), accessCode: "KOR-AST" },
  { name: "Kamal Putra", lembaga: "iysa", role: "supervisor", accessCode: "SUP-KML" },
  { name: "Deni Irawan", lembaga: "iysa", role: "management", accessCode: "MGT-DENI" },
  { name: "Anggraini", lembaga: "iysa", role: "management", accessCode: "MGT-ANGG" },

  // ICGI
  { name: "Kamal Putra", lembaga: "icgi", role: "ceo", accessCode: "CEO-KML" },
  { name: "Deni Irawan", lembaga: "icgi", role: "management", accessCode: "MGT-DENI-I" },
  { name: "Anggraini", lembaga: "icgi", role: "management", accessCode: "MGT-ANGG-I" },

  // IYORA
  { name: "Eki Iman", lembaga: "iyora", role: "pm", accessCode: "PM-EKI" },
  { name: "Deni Irawan", lembaga: "iyora", role: "management", accessCode: "MGT-DENI-O" },
  { name: "Anggraini", lembaga: "iyora", role: "management", accessCode: "MGT-ANGG-O" },
]

async function main() {
  console.log("Seeding new lembaga (iysa/icgi/iyora)...\n")

  let empIns = 0, empUpd = 0
  for (const e of EMPLOYEES) {
    const existing = await prisma.employee.findFirst({
      where: { name: e.name, role: e.role, lembaga: e.lembaga },
    })
    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: { divisi: e.divisi ?? null },
      })
      empUpd++
    } else {
      await prisma.employee.create({
        data: { name: e.name, lembaga: e.lembaga, role: e.role, divisi: e.divisi ?? null },
      })
      empIns++
    }
  }
  console.log(`Employees — inserted: ${empIns}, updated: ${empUpd}`)

  let evIns = 0, evUpd = 0
  for (const ev of EVALUATORS) {
    const existing = await prisma.evaluator.findFirst({
      where: { name: ev.name, lembaga: ev.lembaga },
    })
    if (existing) {
      await prisma.evaluator.update({
        where: { id: existing.id },
        data: { role: ev.role, divisi: ev.divisi ?? null, accessCode: ev.accessCode },
      })
      evUpd++
    } else {
      await prisma.evaluator.create({
        data: {
          name: ev.name,
          lembaga: ev.lembaga,
          role: ev.role,
          divisi: ev.divisi ?? null,
          accessCode: ev.accessCode,
        },
      })
      evIns++
    }
  }
  console.log(`Evaluators — inserted: ${evIns}, updated: ${evUpd}`)

  console.log("\nAccess codes:")
  for (const ev of EVALUATORS) {
    console.log(`  ${ev.accessCode.padEnd(14)} → ${ev.name} (${ev.lembaga} · ${ev.role})`)
  }
  console.log("\nSeeding complete.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
