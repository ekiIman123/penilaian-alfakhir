/**
 * Import staff evaluations from Google Forms response (June 2026).
 * Creates 10 staff teachers + 30 evaluations (3 evaluators × 10 staff).
 * Giar Hermawan, S.Kom is created as a separate "staff" record alongside his existing "guru" record.
 * "Disiplin" from the form maps to both `disiplin` (core_values) and `nilai_disiplin` (nilai section).
 *
 * Run: npx tsx prisma/seed-staff.ts
 */

import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Staff form columns → criteria IDs (22 form columns → 23 staff criteria, disiplin duplicated as nilai_disiplin)
const FORM_CRITERIA_IDS = [
  "pencapaian_hasil", "manajemen_waktu", "kreativitas",
  "loyalitas", "disiplin", "komitmen", "persatuan", "kekompakan",
  "pemecahan_masalah", "pengembangan_profesionalisme", "kemampuan_manajerial",
  "kemampuan_sosialisasi", "empati", "toleransi", "kejujuran",
  "tanggung_jawab", "rasa_hormat", "sopan_santun",
  "sholat_berjamaah", "sholat_dhuha", "tutur_kata", "busana_penampilan",
]

function toStaffScores(vals: number[]): Record<string, number> {
  const obj: Record<string, number> = {}
  FORM_CRITERIA_IDS.forEach((id, i) => { obj[id] = vals[i] })
  obj.nilai_disiplin = vals[4] // mirror disiplin value
  return obj
}

// Staff teachers to create
const STAFF_NAMES = [
  "Nurhidayati, S.Pd",
  "Alya Nabiyla",
  "Arini Nurhidayati",
  "Giar Hermawan, S.Kom",
  "Marnih",
  "Mija",
  "Feriman",
  "Siti Maesaroh",
  "H. Opil",
  "Saman",
]

// [evaluatorName, teacherName, 22 scores, catatan]
const ROWS: [string, string, number[], string | null][] = [
  // ── Anggraini (10 staff) ─────────────────────────────────────────────────────
  ["Anggraini, A.Md", "Nurhidayati, S.Pd",
    [3,3,2,4,3,3,3,3,3,2,3,3,3,3,4,4,3,4,3,3,3,3],
    "Lebih tegas dan kembangkan profesionalisme"],
  ["Anggraini, A.Md", "Alya Nabiyla",
    [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,2],
    "tingkatkan kedisiplinan, ibadah berjamaah & sholat dhuha, juga konsisten dalam bekerja"],
  ["Anggraini, A.Md", "Arini Nurhidayati",
    [3,2,3,3,2,2,3,3,3,2,3,3,3,3,3,3,3,3,1,1,3,3],
    "Tingkatkan kedisiplinan, ibadah berjamaah, sholat duha, dan konsisten dalam bekerja"],
  ["Anggraini, A.Md", "Giar Hermawan, S.Kom",
    [3,3,2,2,2,2,2,2,3,2,2,2,3,3,3,3,3,3,3,3,3,3],
    "Tingkatkan ketelitian, kurangi izin dan lebih menjaga kesehatan dan aktif mengikuti kegiatan eksternal sekolah"],
  ["Anggraini, A.Md", "Marnih",
    [2,3,2,3,3,3,3,3,2,2,2,3,3,3,3,3,3,3,2,1,3,3],
    "Lebih sigap dan inisiatif dalam membersihkan area sekolah, lebih disiplin waktu saat istirahat"],
  ["Anggraini, A.Md", "Mija",
    [3,3,2,3,2,2,3,3,3,2,3,3,3,3,3,3,3,3,1,1,3,3],
    "tingkatkan kedisiplinan dan kinerja, tingkatkan 5S kepada warga dan tamu sekolah"],
  ["Anggraini, A.Md", "Feriman",
    [3,2,3,3,2,3,3,3,3,3,2,2,2,2,3,2,3,3,1,1,3,3],
    "tingkatkan kedisiplinan, kurangi izin, lebih menjaga kesehatan, dan tingkatkan inisiatif juga koordinasi"],
  ["Anggraini, A.Md", "Siti Maesaroh",
    [3,3,3,4,4,4,3,3,3,3,3,3,3,3,3,4,3,3,1,1,3,3],
    "Pertahankan kinerja dan lebih tegas kepada mereka yang tidak support dalam membantu"],
  ["Anggraini, A.Md", "H. Opil",
    [3,2,3,3,3,3,3,3,3,3,3,3,2,2,3,3,3,3,2,2,3,3],
    "Tingkatkan kinerja, konsisten dalam membersihkan area sekolah dan beri contoh yang baik bagi bawahan."],
  ["Anggraini, A.Md", "Saman",
    [3,3,2,3,3,3,3,3,2,2,3,3,3,3,3,3,3,3,2,2,3,3],
    "Pertahankan kinerja yang sudah baik, kurangi bermain handphone"],

  // ── Arifah (10 staff) — using latest Saman entry (16:55:00) ─────────────────
  ["Arifah Hilyati, S.S., M.Pd", "Nurhidayati, S.Pd",
    [4,3,4,3,3,4,4,4,3,3,3,4,4,4,4,4,4,4,3,3,4,3],
    "well done"],
  ["Arifah Hilyati, S.S., M.Pd", "Alya Nabiyla",
    [3,2,4,3,2,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,3,2],
    "done"],
  ["Arifah Hilyati, S.S., M.Pd", "Arini Nurhidayati",
    [3,2,3,3,1,2,3,3,2,3,2,3,3,3,3,2,3,3,1,1,3,2],
    "done"],
  ["Arifah Hilyati, S.S., M.Pd", "Giar Hermawan, S.Kom",
    [3,3,2,2,2,2,2,2,2,3,2,2,3,3,2,2,3,3,3,3,3,3],
    "done"],
  ["Arifah Hilyati, S.S., M.Pd", "Marnih",
    [3,4,3,4,4,4,3,3,2,2,2,3,3,3,3,4,4,4,2,1,4,3],
    "done"],
  ["Arifah Hilyati, S.S., M.Pd", "Mija",
    [3,3,3,3,3,3,3,3,3,2,2,3,3,3,3,3,3,3,1,1,3,3],
    "done"],
  ["Arifah Hilyati, S.S., M.Pd", "Feriman",
    [3,2,3,2,2,2,3,3,3,1,2,2,3,3,3,2,4,4,2,2,3,2],
    "done"],
  ["Arifah Hilyati, S.S., M.Pd", "Siti Maesaroh",
    [4,4,4,4,4,4,4,4,4,2,2,3,4,4,4,4,4,4,2,1,4,4],
    "done"],
  ["Arifah Hilyati, S.S., M.Pd", "H. Opil",
    [3,3,3,3,2,2,3,3,3,2,2,3,3,3,3,3,3,3,3,1,3,3],
    "done"],
  ["Arifah Hilyati, S.S., M.Pd", "Saman",
    [3,4,3,4,4,4,4,4,3,1,1,3,4,4,4,4,4,4,3,3,4,4],
    "Done"],

  // ── Deny Rahmat (10 staff) ───────────────────────────────────────────────────
  ["Deny Rahmat, S.Sos.I", "Nurhidayati, S.Pd",
    [3,2,3,3,3,3,4,3,3,3,3,3,3,3,4,4,4,4,3,3,4,4],
    null],
  ["Deny Rahmat, S.Sos.I", "Alya Nabiyla",
    [3,2,2,2,2,2,2,2,2,2,2,1,3,2,3,2,2,2,1,1,2,3],
    null],
  ["Deny Rahmat, S.Sos.I", "Arini Nurhidayati",
    [2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,1,1,3,3],
    null],
  ["Deny Rahmat, S.Sos.I", "Giar Hermawan, S.Kom",
    [3,2,3,3,2,3,2,2,3,2,3,2,3,3,2,3,3,3,2,1,3,4],
    null],
  ["Deny Rahmat, S.Sos.I", "Marnih",
    [2,3,2,3,3,3,3,3,2,2,1,3,3,3,3,3,3,3,1,1,3,3],
    null],
  ["Deny Rahmat, S.Sos.I", "Mija",
    [3,3,3,3,3,3,3,2,3,3,3,3,3,3,3,3,3,3,1,1,3,3],
    null],
  ["Deny Rahmat, S.Sos.I", "Feriman",
    [3,2,4,3,2,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,3,4],
    null],
  ["Deny Rahmat, S.Sos.I", "Siti Maesaroh",
    [3,3,2,3,3,3,3,3,2,2,2,3,3,3,3,3,3,3,1,1,3,3],
    null],
  ["Deny Rahmat, S.Sos.I", "H. Opil",
    [3,3,3,3,3,3,3,4,3,2,3,3,3,3,3,3,3,3,3,1,3,3],
    null],
  ["Deny Rahmat, S.Sos.I", "Saman",
    [2,3,2,3,3,3,3,3,2,2,2,3,3,3,3,3,3,3,3,1,3,3],
    null],
]

async function main() {
  const evaluators = await prisma.evaluator.findMany()
  const evMap = new Map(evaluators.map((e) => [e.name, e.id]))

  // Create or find staff teachers
  const staffMap = new Map<string, string>()
  for (const name of STAFF_NAMES) {
    const existing = await prisma.employee.findFirst({ where: { name, role: "staff" } })
    if (existing) {
      staffMap.set(name, existing.id)
      console.log(`ℹ  Exists:   ${name} (staff)`)
    } else {
      const created = await prisma.employee.create({ data: { name, role: "staff" } })
      staffMap.set(name, created.id)
      console.log(`➕ Created:  ${name} (staff)`)
    }
  }

  console.log("")
  let inserted = 0, updated = 0, skipped = 0

  for (const [evName, tchName, scoreVals, catatan] of ROWS) {
    const evaluatorId = evMap.get(evName)
    const employeeId  = staffMap.get(tchName)

    if (!evaluatorId) {
      console.warn(`⚠  Evaluator not found: "${evName}"`)
      skipped++
      continue
    }
    if (!employeeId) {
      console.warn(`⚠  Teacher not found:   "${tchName}"`)
      skipped++
      continue
    }

    const scores = JSON.stringify(toStaffScores(scoreVals))
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
        data: { evaluatorId, employeeId, scores, catatan: catatan === "-" ? null : catatan },
      })
      console.log(`✅ Inserted: ${evName.split(",")[0]} → ${tchName}`)
      inserted++
    }
  }

  console.log(`\nDone. Created/found teachers: ${STAFF_NAMES.length}`)
  console.log(`Evaluations — Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
