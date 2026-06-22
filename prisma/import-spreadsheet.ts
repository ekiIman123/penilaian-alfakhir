/**
 * Import data dari Google Spreadsheet ke database.
 * Data: 2 penilai × 14 guru = 28 evaluasi.
 * Jalankan: npx tsx prisma/import-spreadsheet.ts
 */
import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Existing IDs (dari seed.ts, jangan diubah) ──────────────────────────────

const EV = {
  anggraini: "cf7107277b6ee741f79c7",
  arifah:    "c6f7e4fd6d7b97f33cc69",
}

const T = {
  aulia:    "cdeb0d7fd56874d9febe6",
  ariyanto: "cdf409cf3b413efa4e78d",
  alfiyyah: "c3a402e83bab02cbcf8f6",
  ahmad:    "c09aa6d3890494f669819",
  dedi:     "c8813cd1d20995664225a",
  lulu:     "c95843ee808bd4184528a",
  asroru:   "c090d1836fde2ac2d0795",
  faisal:   "c1e4c075c71197f506e4d",
  mutiara:  "c8da9a40cd2c523f967ca",
  nurfaidah:"c2100f8e1d890a6999ee6",
  zahro:    "c8b4ddb6c60ab350b930d",
  thio:     "c6b5e6d863e9090062f8b",
  nurhida:  "c4cf903415b8fc375ace1",
  giar:     "ca168824281418580fb11",
}

// ── Helper: buat objek scores dari array (urutan = urutan kolom spreadsheet) ─

function s(v: number[]): string {
  const keys = [
    "pencapaian_hasil", "manajemen_waktu", "kreativitas",
    "loyalitas", "disiplin", "komitmen", "persatuan", "kekompakan",
    "kemampuan_mengajar", "administrasi_pengajaran", "kemampuan_mentoring",
    "pemecahan_masalah", "pengembangan_profesionalisme", "kemampuan_manajerial",
    "kemampuan_sosialisasi", "empati", "toleransi", "kejujuran",
    "tanggung_jawab", "rasa_hormat", "sopan_santun",
    "sholat_berjamaah", "sholat_dhuha", "tutur_kata", "busana_penampilan",
  ]
  return JSON.stringify(Object.fromEntries(keys.map((k, i) => [k, v[i]])))
}

// ── Data evaluasi dari spreadsheet ──────────────────────────────────────────
// Format: { evaluatorId, teacherId, scores, catatan }

const EVALUATIONS = [

  // ── ANGGRAINI, A.Md ──────────────────────────────────────────────────────
  {
    evaluatorId: EV.anggraini, teacherId: T.giar,
    scores: s([3,2,2,2,2,2,2,2,3,3,2,3,3,3,2,3,3,3,3,3,3,3,3,3,3]),
    catatan: "Pak Giar sering absen dan izin dengan alasan sakit, anak sakit, urus taspen, dll",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.aulia,
    scores: s([3,3,3,3,3,3,3,3,3,3,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3]),
    catatan: "kinerja sudah bagus, kompetensi dan mentoring ditingkatkan",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.ariyanto,
    scores: s([4,4,3,3,3,3,3,3,4,4,3,3,3,2,3,3,3,3,3,4,4,3,3,3,3]),
    catatan: "tingkatkan persatuan, kekompakan, dan keaktifan dalam kegiatan sekolah",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.alfiyyah,
    scores: s([2,3,2,3,3,3,3,3,2,3,2,2,2,2,3,3,3,3,3,3,3,3,2,3,3]),
    catatan: "tingkatkan kemampuan dan profesionalisme dalam mengajar",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.ahmad,
    scores: s([3,2,2,2,3,2,2,2,2,2,2,2,2,2,3,2,3,3,2,3,3,4,4,3,3]),
    catatan: "mohon tidak tidur saat jam kerja",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.dedi,
    scores: s([3,3,2,3,3,3,3,3,3,2,3,3,3,3,3,3,3,3,3,3,3,4,4,3,4]),
    catatan: "tingkatkan penguasaan teknologi dan komputer",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.lulu,
    scores: s([3,3,3,3,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3]),
    catatan: "kurangi izin dan gunakan seragam serta jilbab sesuai jadwal",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.asroru,
    scores: s([3,2,3,3,2,2,3,3,3,2,3,3,3,3,4,4,4,3,3,3,3,3,3,3,2]),
    catatan: "tingkatkan kedisiplinan dan kerapian dalam berpakaian",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.faisal,
    scores: s([3,3,3,3,3,3,3,3,3,2,3,3,3,3,3,3,3,3,3,3,3,4,4,4,4]),
    catatan: "Ust Faisal belum genap setahun & belum mengajar full, jadi belum terlihat saat bekerja dengan load yang tinggi.",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.mutiara,
    scores: s([3,3,2,3,4,3,3,3,3,3,3,2,3,3,3,3,3,3,3,3,3,3,3,3,4]),
    catatan: "tingkatkan kompetensi dan kembangkan profesionalisme dalam mengajar",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.nurfaidah,
    scores: s([3,2,2,2,2,3,3,3,3,3,3,3,2,3,3,3,3,3,3,3,3,3,3,3,4]),
    catatan: "tingkatkan kedisiplinan dan kinerja",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.zahro,
    scores: s([3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4,4]),
    catatan: "tingkatkan kedisiplinan",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.thio,
    scores: s([2,3,2,3,3,3,3,3,2,2,3,2,2,3,3,3,3,3,3,3,3,3,3,3,3]),
    catatan: "tingkatkan kompetensi dan pengembangan profesionalisme",
  },
  {
    evaluatorId: EV.anggraini, teacherId: T.nurhida,
    scores: s([3,2,2,3,3,3,3,3,3,2,3,3,2,3,3,3,3,3,3,3,3,3,3,3,3]),
    catatan: "tingkatkan kompetensi dan pengembangan profesionalisme",
  },

  // ── ARIFAH HILYATI, S.S., M.Pd ───────────────────────────────────────────
  {
    evaluatorId: EV.arifah, teacherId: T.aulia,
    scores: s([3,4,4,4,4,4,3,3,4,3,4,3,4,3,4,3,3,4,4,3,3,3,3,3,4]),
    catatan: "Aulia memiliki leadership yang cukup baik, perlu dibimbing secara intensif oleh managemen.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.ariyanto,
    scores: s([3,3,3,3,4,3,3,3,3,4,4,3,3,4,4,3,3,4,3,4,4,4,4,4,4]),
    catatan: "Dalam segala aspek Pak Ari sudah menunjukkan performa yang baik, yang perlu ditingkatkan adalah loyalitas pada lembaga karena sering kali pulang mendahului guru dan staff yang lain ketika kegiatan kepanitiaan",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.alfiyyah,
    scores: s([3,3,2,3,3,3,3,3,2,3,2,2,2,2,2,3,3,3,4,3,3,3,3,3,3]),
    catatan: "Alfi cukup bertanggung jawab ketika diberikan tugas - tugas untuk kegiatan sekolah maupun kepanitian. Yang harus ditingkatkan adalah ketrampilan mengajar, ketrampilan berkomunikasi. Literasinya harus ditingkatkan.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.ahmad,
    scores: s([2,3,2,3,2,3,3,3,2,2,2,2,2,2,3,2,2,3,3,3,3,3,3,3,2]),
    catatan: "Ustadz Marzuki sering tertidur di jam kerja. Beberapa kali izin untuk urusan di luar dan baru hadir di sekolah di siang bahkan sore hari ketika aktifitas di sekolah akan berakhir.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.dedi,
    scores: s([3,3,2,3,3,3,3,3,3,2,2,3,2,3,3,3,3,4,3,4,4,4,4,4,3]),
    catatan: "Ustadz Dedi bertanggung jawab ketika diberikan tugas. Kemampuan literasi dan penggunaan teknologi harus ditingkatkan.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.lulu,
    scores: s([3,3,3,3,2,3,2,2,3,3,3,3,3,3,3,3,3,3,3,4,3,3,3,3,2]),
    catatan: "Bu Lulu menunjukkan performa yang baik di hampir segala hal. Namun perizinan cukup sering baik karena kondisi kesehatan, urusan keluarga dll. Untuk seragam, sering kali Bu Lulu memakai seragam yang berbeda tidak sesuai dengan aturan yang ditetapkan.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.asroru,
    scores: s([4,2,3,3,2,3,4,4,3,2,3,3,3,3,4,4,4,4,3,4,4,3,3,4,2]),
    catatan: "Dalam segala hal Asror sudah menunjukkan performa yang baik. Yang harus ditingkatkan adalah kedisiplinan dan time management.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.faisal,
    scores: s([4,3,3,3,3,3,4,4,4,3,4,3,3,4,3,3,3,4,4,4,4,4,4,4,4]),
    catatan: "Ustadz Faisal menunjukkan performa yang baik, meskipun beliau adalah pendatang baru di lembaga ini. Beberapa tugas yang dibebankan padanya bisa dilaksanakan dengan baik. Namun selama 1 semester ini ada beberapa hari beliau tidak masuk karena alasan kesehatan.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.mutiara,
    scores: s([3,3,3,3,3,3,2,2,3,3,3,3,3,3,3,3,3,4,4,4,4,3,3,3,3]),
    catatan: "Mutiara menunjukkan performa kerja yang baik, kemampuan berkomunikasi juga baik, disiplin, time management juga baik.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.nurfaidah,
    scores: s([3,2,3,3,3,2,2,2,4,3,3,3,2,3,3,3,3,4,3,4,4,3,2,4,4]),
    catatan: "Nur Faidah Djaelani menunjukkan performa kerja yang baik, pembelajar yang cepat, kemampuan komunikasinya baik. Namun, sering sekali izin karena kesehatan dan urusan keluarga juga perizinan di jam kerja. Beliau belum sekalipun mengikuti kegiatan pengembangan profesi yang disediakan oleh sekolah.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.zahro,
    scores: s([3,2,4,3,2,3,2,2,3,3,3,3,3,3,4,4,4,3,3,4,4,3,3,4,4]),
    catatan: "Zahro menunjukkan performa kerja yang baik. Beliau bisa mengemban tugas dengan baik, totalitas dalam melaksanakan tugasnya, namun Zahro justru mengesampingkan tugas utamanya sebagai wali kelas terutama administrasi perangkat pembelajaran, masih sering terlambat datang ke sekolah.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.thio,
    scores: s([3,3,2,3,3,3,3,3,3,2,3,2,3,2,3,3,3,3,3,3,3,3,3,3,2]),
    catatan: "Tio harus meningkatkan banyak hal terutama di bidang teknologi digital. Sering panik ketika under pressure. Self-controlnya harus ditingkatkan.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.nurhida,
    scores: s([3,3,3,4,3,4,4,4,3,3,3,3,3,4,3,4,4,4,4,4,4,3,3,4,3]),
    catatan: "Bu Nun menunjukkan performa kerja yang baik. Yang harus ditingkatkan adalah time management, masih sering hadir terlambat ke sekolah.",
  },
  {
    evaluatorId: EV.arifah, teacherId: T.giar,
    scores: s([3,2,3,3,2,3,3,3,2,2,2,3,3,2,2,3,3,3,3,3,3,3,3,3,3]),
    catatan: "Pak Giar masih sering izin tidak masuk sekolah sehingga mengurangi performa kinerjanya.",
  },
]

async function main() {
  console.log("Mengimpor data dari spreadsheet...")
  console.log(`Total evaluasi: ${EVALUATIONS.length}`)

  let upserted = 0
  for (const ev of EVALUATIONS) {
    await prisma.evaluation.upsert({
      where: { evaluatorId_teacherId: { evaluatorId: ev.evaluatorId, teacherId: ev.teacherId } },
      update: { scores: ev.scores, catatan: ev.catatan ?? null },
      create: { evaluatorId: ev.evaluatorId, teacherId: ev.teacherId, scores: ev.scores, catatan: ev.catatan ?? null },
    })
    upserted++
    process.stdout.write(`\r  ✓ ${upserted}/${EVALUATIONS.length} evaluasi`)
  }

  console.log("\nImport selesai!")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
