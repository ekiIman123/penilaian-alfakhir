import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local", override: false })
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Preserves existing IDs so relations stay intact
const EVALUATORS = [
  { id: "cf7107277b6ee741f79c7", name: "Anggraini, A.Md" },
  { id: "cb20c26941d0757098ee6", name: "Deny Rahmat, S.Sos.I" },
  { id: "c6f7e4fd6d7b97f33cc69", name: "Arifah Hilyati, S.S., M.Pd" },
  { id: "cmqnh83p900034w8wf3yl59a8", name: "Iman" },
]

const TEACHERS = [
  { id: "cdeb0d7fd56874d9febe6", name: "Aulia Safitri, S.Pd" },
  { id: "cdf409cf3b413efa4e78d", name: "Ariyanto, SE" },
  { id: "c3a402e83bab02cbcf8f6", name: "Alfiyyah Nur Lail, S.Pd" },
  { id: "c09aa6d3890494f669819", name: "Ahmad Marzuki Nasution" },
  { id: "c8813cd1d20995664225a", name: "Dedi Setiadi" },
  { id: "c95843ee808bd4184528a", name: "Lulu Lutfiyah, S.Pd" },
  { id: "c090d1836fde2ac2d0795", name: "Mochamad Asroru Pahala, S.Pd" },
  { id: "c1e4c075c71197f506e4d", name: "Muhammad Faisal, S. Sos." },
  { id: "c8da9a40cd2c523f967ca", name: "Mutiara Indah Pratiwi, S.Pd.I" },
  { id: "c2100f8e1d890a6999ee6", name: "Nur Faidah Djaelani, S.Pd" },
  { id: "c8b4ddb6c60ab350b930d", name: "Syarifatu Zahro, S.Pd" },
  { id: "c6b5e6d863e9090062f8b", name: "Thio Pratama, S. Kom" },
  { id: "c4cf903415b8fc375ace1", name: "Nurhidayatii, S.Pd" },
  { id: "ca168824281418580fb11", name: "Giar Hermawan, S.Kom" },
]

const EVALUATIONS = [
  {
    id: "cmqnckf7e00004w8wyfqdm453",
    evaluatorId: "cf7107277b6ee741f79c7",
    employeeId: "c09aa6d3890494f669819",
    scores: JSON.stringify({ pencapaian_hasil:4, manajemen_waktu:3, kreativitas:3, loyalitas:4, disiplin:4, komitmen:4, persatuan:3, kekompakan:4, kemampuan_mengajar:4, administrasi_pengajaran:3, kemampuan_mentoring:3, pemecahan_masalah:4, pengembangan_profesionalisme:3, kemampuan_manajerial:3, kemampuan_sosialisasi:4, empati:4, toleransi:4, kejujuran:4, tanggung_jawab:4, rasa_hormat:4, sopan_santun:3, sholat_berjamaah:4, sholat_dhuha:3, tutur_kata:4, busana_penampilan:4 }),
    catatan: "Secara keseluruhan Pak Ahmad menunjukkan kinerja yang sangat baik. Perlu ditingkatkan kreativitas dalam pengajaran dan konsistensi administrasi.",
  },
  {
    id: "cmqnckke200014w8wckkixb8i",
    evaluatorId: "c6f7e4fd6d7b97f33cc69",
    employeeId: "c09aa6d3890494f669819",
    scores: JSON.stringify({ pencapaian_hasil:3, manajemen_waktu:4, kreativitas:4, loyalitas:4, disiplin:3, komitmen:4, persatuan:4, kekompakan:3, kemampuan_mengajar:4, administrasi_pengajaran:4, kemampuan_mentoring:3, pemecahan_masalah:3, pengembangan_profesionalisme:4, kemampuan_manajerial:3, kemampuan_sosialisasi:4, empati:3, toleransi:4, kejujuran:4, tanggung_jawab:4, rasa_hormat:4, sopan_santun:4, sholat_berjamaah:4, sholat_dhuha:4, tutur_kata:4, busana_penampilan:3 }),
    catatan: "Guru ini memiliki kemampuan mengajar yang baik dan disiplin dalam menjalankan tugasnya. Perlu peningkatan dalam mentoring siswa.",
  },
  {
    id: "cmqnckpyp00024w8w34dqagru",
    evaluatorId: "cb20c26941d0757098ee6",
    employeeId: "c09aa6d3890494f669819",
    scores: JSON.stringify({ pencapaian_hasil:4, manajemen_waktu:4, kreativitas:3, loyalitas:3, disiplin:4, komitmen:3, persatuan:4, kekompakan:4, kemampuan_mengajar:3, administrasi_pengajaran:4, kemampuan_mentoring:4, pemecahan_masalah:4, pengembangan_profesionalisme:3, kemampuan_manajerial:4, kemampuan_sosialisasi:4, empati:4, toleransi:3, kejujuran:4, tanggung_jawab:3, rasa_hormat:4, sopan_santun:4, sholat_berjamaah:3, sholat_dhuha:4, tutur_kata:3, busana_penampilan:4 }),
    catatan: "Ahmad Marzuki menunjukkan dedikasi yang tinggi. Kemampuan manajerial kelas perlu ditingkatkan lebih lanjut untuk hasil yang lebih optimal.",
  },
  {
    id: "cmqnm4mfs00044w8wicvu6riv",
    evaluatorId: "cmqnh83p900034w8wf3yl59a8",
    employeeId: "c09aa6d3890494f669819",
    scores: JSON.stringify({ pencapaian_hasil:4, manajemen_waktu:3, kreativitas:4, loyalitas:4, disiplin:3, komitmen:4, persatuan:4, kekompakan:3, kemampuan_mengajar:4, administrasi_pengajaran:3, kemampuan_mentoring:4, pemecahan_masalah:3, pengembangan_profesionalisme:4, kemampuan_manajerial:3, kemampuan_sosialisasi:4, empati:4, toleransi:4, kejujuran:4, tanggung_jawab:4, rasa_hormat:4, sopan_santun:4, sholat_berjamaah:4, sholat_dhuha:3, tutur_kata:4, busana_penampilan:4 }),
    catatan: "Ahmad Marzuki menunjukkan kinerja yang baik secara keseluruhan, terutama dalam aspek nilai dan spiritual. Peningkatan lebih lanjut pada kemampuan manajerial dan konsistensi administrasi akan membawa hasil yang lebih optimal.",
  },
]

async function main() {
  console.log("Seeding database...")

  for (const ev of EVALUATORS) {
    await prisma.evaluator.upsert({
      where: { id: ev.id },
      update: { name: ev.name },
      create: ev,
    })
  }
  console.log(`✓ ${EVALUATORS.length} evaluators seeded`)

  for (const t of TEACHERS) {
    await prisma.employee.upsert({
      where: { id: t.id },
      update: { name: t.name },
      create: t,
    })
  }
  console.log(`✓ ${TEACHERS.length} teachers seeded`)

  for (const e of EVALUATIONS) {
    await prisma.evaluation.upsert({
      where: { id: e.id },
      update: { scores: e.scores, catatan: e.catatan },
      create: e,
    })
  }
  console.log(`✓ ${EVALUATIONS.length} evaluations seeded`)

  console.log("Seeding complete!")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
