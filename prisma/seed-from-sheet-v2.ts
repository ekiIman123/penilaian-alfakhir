/**
 * Import evaluations from Google Sheets response (June 2026 batch 2).
 * Adds 14 new evaluations from Deny Rahmat, S.Sos.I
 * Updates Arifah's evaluation for Aulia (newer submission on 6/22/2026).
 *
 * Run: npx tsx prisma/seed-from-sheet-v2.ts
 */

import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const CRITERIA_IDS = [
  // PRESTASI (3)
  "pencapaian_hasil", "manajemen_waktu", "kreativitas",
  // CORE VALUES (5)
  "loyalitas", "disiplin", "komitmen", "persatuan", "kekompakan",
  // POTENSI (6)
  "kemampuan_mengajar", "administrasi_pengajaran", "kemampuan_mentoring",
  "pemecahan_masalah", "pengembangan_profesionalisme", "kemampuan_manajerial",
  // VALUE (7)
  "kemampuan_sosialisasi", "empati", "toleransi", "kejujuran",
  "tanggung_jawab", "rasa_hormat", "sopan_santun",
  // SPIRITUAL (4)
  "sholat_berjamaah", "sholat_dhuha", "tutur_kata", "busana_penampilan",
]

function toScores(vals: number[]): Record<string, number> {
  const obj: Record<string, number> = {}
  CRITERIA_IDS.forEach((id, i) => { obj[id] = vals[i] })
  return obj
}

// Raw spreadsheet data: [evaluatorName, teacherName, ...25 scores, catatan]
const ROWS: [string, string, number[], string | null][] = [
  // ── Arifah update (Aulia, 6/22/2026 — newer submission) ──────────────────
  ["Arifah Hilyati, S.S., M.Pd", "Aulia Safitri, S.Pd",
    [3,4,4, 4,4,4,3,3, 4,3,4,3,4,3, 4,3,3,4,4,3,3, 3,3,3,4],
    "Aulia memiliki leadership yang cukup baik, perlu dibimbing secara intensif oleh managemen."],

  // ── Deny Rahmat (all 14 teachers) ────────────────────────────────────────
  ["Deny Rahmat, S.Sos.I", "Aulia Safitri, S.Pd",
    [3,3,3, 4,3,4,3,3, 3,3,3,3,3,3, 3,4,4,4,4,4,4, 4,4,4,4],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Ariyanto, SE",
    [3,3,2, 2,3,3,3,3, 3,4,3,3,3,3, 3,3,3,4,3,4,4, 3,3,3,4],
    "Sholat dhuha dan berjamaah terkadang telat"],
  ["Deny Rahmat, S.Sos.I", "Alfiyyah Nur Lail, S.Pd",
    [2,3,3, 3,4,3,3,3, 2,4,2,2,2,3, 3,4,4,4,4,4,4, 2,2,3,3],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Ahmad Marzuki Nasution",
    [2,2,2, 2,3,2,3,3, 3,2,2,2,2,2, 3,3,3,4,4,4,4, 4,4,4,3],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Dedi Setiadi",
    [2,3,3, 3,4,3,3,3, 2,2,2,2,2,3, 3,4,4,4,4,4,4, 4,4,4,4],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Lulu Lutfiyah, S.Pd",
    [3,3,4, 3,3,4,3,3, 3,4,3,3,3,4, 3,4,4,4,4,4,4, 4,4,4,4],
    "Saya mengisi sesuai apa adanya dan tetep profisonal"],
  ["Deny Rahmat, S.Sos.I", "Mochamad Asroru Pahala, S.Pd",
    [3,2,4, 4,2,3,3,3, 3,3,3,3,3,4, 3,4,4,4,4,4,4, 3,3,3,3],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Muhammad Faisal, S. Sos.",
    [2,3,4, 3,3,3,3,3, 2,2,3,3,3,3, 3,4,4,4,4,4,4, 4,4,4,4],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Mutiara Indah Pratiwi, S.Pd.I",
    [3,3,3, 3,3,3,3,3, 3,4,3,3,2,3, 3,3,4,4,4,4,4, 3,3,4,4],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Nur Faidah Djaelani, S.Pd",
    [3,3,3, 2,2,3,3,3, 3,3,3,3,2,3, 3,4,4,4,4,4,4, 3,3,4,4],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Syarifatu Zahro, S.Pd",
    [3,3,4, 4,4,3,3,3, 3,4,3,3,3,3, 3,4,4,4,4,4,4, 3,3,4,4],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Thio Pratama, S. Kom",
    [3,3,2, 3,4,3,3,3, 3,3,2,2,3,2, 3,3,3,4,4,4,4, 4,4,4,3],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Nurhidayatii, S.Pd",
    [3,3,3, 3,3,3,3,3, 3,2,2,2,2,3, 3,4,4,4,4,4,4, 3,3,4,4],
    "-"],
  ["Deny Rahmat, S.Sos.I", "Giar Hermawan, S.Kom",
    [3,3,2, 3,3,3,3,3, 2,3,2,3,3,3, 2,3,3,3,3,3,4, 2,1,3,3],
    "-"],
]

async function main() {
  // Fetch all evaluators and teachers by name
  const evaluators = await prisma.evaluator.findMany()
  const teachers   = await prisma.employee.findMany()

  const evMap  = new Map(evaluators.map((e) => [e.name, e.id]))
  const tchMap = new Map(teachers.map((t)   => [t.name, t.id]))

  let inserted = 0
  let updated  = 0
  let skipped  = 0

  for (const [evName, tchName, scoreVals, catatan] of ROWS) {
    const evaluatorId = evMap.get(evName)
    const employeeId  = tchMap.get(tchName)

    if (!evaluatorId) {
      console.warn(`⚠  Evaluator not found: "${evName}"`)
      skipped++
      continue
    }
    if (!employeeId) {
      console.warn(`⚠  Teacher not found: "${tchName}"`)
      skipped++
      continue
    }

    const scores = JSON.stringify(toScores(scoreVals))
    const existing = await prisma.evaluation.findUnique({
      where: { evaluatorId_employeeId: { evaluatorId, employeeId } },
    })

    if (existing) {
      await prisma.evaluation.update({
        where: { id: existing.id },
        data: { scores, catatan: catatan === "-" ? null : catatan },
      })
      console.log(`✏  Updated:  ${evName.split(",")[0]} → ${tchName}`)
      updated++
    } else {
      await prisma.evaluation.create({
        data: {
          evaluatorId,
          employeeId,
          scores,
          catatan: catatan === "-" ? null : catatan,
        },
      })
      console.log(`✅ Inserted: ${evName.split(",")[0]} → ${tchName}`)
      inserted++
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
