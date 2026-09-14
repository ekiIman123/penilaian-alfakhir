/**
 * Pemulihan data setelah perusakan 31 Agustus 2026.
 *
 * Jalankan dalam dua tahap:
 *
 *   npx tsx prisma/pulihkan-iysa.ts              → hanya menampilkan rencana
 *   npx tsx prisma/pulihkan-iysa.ts --terapkan   → benar-benar mengubah data
 *
 * PENTING: pastikan cadangan basis data dan berkas bukti di
 * ~/Documents/IYSA/INSIDEN-2026-08-31/ sudah diamankan sebelum menjalankan
 * dengan --terapkan. Pemulihan menimpa keadaan yang menjadi barang bukti.
 *
 * Yang TIDAK bisa dipulihkan script ini: angka penilaian kinerja. Data itu
 * ikut terhapus bersama karyawannya (relasi onDelete: Cascade) dan hanya bisa
 * kembali lewat point-in-time restore dari penyedia basis data.
 */
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const TERAPKAN = process.argv.includes("--terapkan")

// ── Karyawan IYSA yang dihapus ────────────────────────────────────────────
// Sumber: prisma/seed-new-lembaga.ts, keadaan sebelum perusakan.
const KARYAWAN_IYSA: { name: string; role: string; divisi: string | null }[] = [
  { name: "Maulana",             role: "staff",       divisi: "Publikasi dan Promosi" },
  { name: "Bunga",               role: "staff",       divisi: "Publikasi dan Promosi" },
  { name: "Indah",               role: "staff",       divisi: "Publikasi dan Promosi" },
  { name: "Nadya",               role: "staff",       divisi: "Publikasi dan Promosi" },
  { name: "Handaka",             role: "staff",       divisi: "Publikasi dan Promosi" },
  { name: "Auli",                role: "staff",       divisi: "Publikasi dan Promosi" },
  { name: "Candini",             role: "staff",       divisi: "RnD" },
  { name: "Iqbal",               role: "staff",       divisi: "RnD" },
  { name: "Zaidan Adi Prasetya", role: "staff",       divisi: "IT" },
  { name: "Dini J",              role: "staff",       divisi: "Administrasi" },
  { name: "Khansa",              role: "staff",       divisi: "Administrasi" },
  { name: "Cinta",               role: "staff",       divisi: "Administrasi" },
  { name: "Rafida",              role: "staff",       divisi: "Administrasi" },
  { name: "Risna",               role: "staff",       divisi: "Administrasi" },
  { name: "Umi",                 role: "staff",       divisi: "Administrasi" },
  { name: "Azizah",              role: "staff",       divisi: "Administrasi" },
  { name: "Zaidan",              role: "koordinator", divisi: "Koordinator" },
  { name: "Eki",                 role: "koordinator", divisi: "Koordinator" },
  { name: "Astri",               role: "koordinator", divisi: "Koordinator" },
  { name: "Kamal Putra",         role: "supervisor",  divisi: null },
]

/**
 * Nama asli keempat penilai IYSA yang diubah namanya.
 *
 * Divisi dan kode aksesnya ikut ditimpa, jadi tidak bisa dipakai sebagai
 * penanda. Yang menyelamatkan pemetaan ini adalah stempel waktu `createdAt`
 * berpresisi milidetik: seed menyisipkan penilai secara berurutan dengan jeda
 * ~40 ms, dan urutan itu masih utuh karena pelaku hanya mengubah nama.
 *
 *   17:07:36.689  →  Zaidan       (koordinator, disisipkan ke-1)
 *   17:07:36.729  →  Eki          (koordinator, ke-2)
 *   17:07:36.769  →  Astri        (koordinator, ke-3)
 *   17:07:36.808  →  Kamal Putra  (supervisor,  ke-4)
 *
 * Peran ikut mencocokkan: tiga pertama koordinator, keempat supervisor.
 * Script menampilkan pemetaannya sebelum menerapkan — periksa dulu.
 */
const PENILAI_IYSA_URUT: { name: string; role: string; divisi: string | null }[] = [
  { name: "Zaidan",      role: "koordinator", divisi: JSON.stringify(["IT", "Publikasi dan Promosi"]) },
  { name: "Eki",         role: "koordinator", divisi: JSON.stringify(["RnD"]) },
  { name: "Astri",       role: "koordinator", divisi: JSON.stringify(["Administrasi"]) },
  { name: "Kamal Putra", role: "supervisor",  divisi: null },
]

/**
 * Identitas lembaga yang ditimpa.
 *
 * Nilai asli sebelum perusakan tidak tersimpan di mana pun, jadi yang di bawah
 * adalah isian yang wajar — PERIKSA DAN SESUAIKAN sebelum menjalankan dengan
 * --terapkan. Logo dikosongkan supaya gambar sepeda hilang; unggah ulang logo
 * yang benar lewat halaman Pengaturan setelah pemulihan.
 */
const PENGATURAN: Record<string, Record<string, string | null>> = {
  iysa: {
    yayasanName:   "Indonesian Young Scientist Association",
    schoolName:    "IYSA",
    address:       "",
    phone:         "",
    city:          "Jakarta",
    periodLabel:   "",
    kepalaSekolah: "",
    kepalaTitle:   "Supervisor IYSA",
    signer2Name:   "",
    signer2Title:  "General Manager",
    ketuaName:     "",
    ketuaTitle:    "Founder",
  },
  icgi: {
    yayasanName:   "Indonesian Center for Global Innovation",
    schoolName:    "ICGI",
    address:       "",
    phone:         "",
    city:          "Jakarta",
    periodLabel:   "",
    kepalaSekolah: "",
    kepalaTitle:   "CEO ICGI",
    signer2Name:   "",
    signer2Title:  "General Manager",
    ketuaName:     "",
    ketuaTitle:    "Founder",
  },
  iyora: {
    yayasanName:   "Indonesian Young Researchers Association",
    schoolName:    "IYORA",
    address:       "",
    phone:         "",
    city:          "Jakarta",
    periodLabel:   "",
    kepalaSekolah: "",
    kepalaTitle:   "Project Manager IYORA",
    signer2Name:   "",
    signer2Title:  "General Manager",
    ketuaName:     "",
    ketuaTitle:    "Founder",
  },
}

const RUSAK = /KONTOL/i

function judul(t: string) {
  console.log(`\n${t}\n${"─".repeat(t.length)}`)
}

async function main() {
  console.log(
    TERAPKAN
      ? "\n⚠  MODE TERAPKAN — data akan benar-benar diubah\n"
      : "\n◇  MODE PRATINJAU — tidak ada yang diubah. Tambahkan --terapkan untuk menjalankan.\n"
  )

  // ── 1. Mengembalikan nama penilai ───────────────────────────────────────
  judul("1. Nama penilai IYSA")

  const penilaiRusak = await prisma.evaluator.findMany({
    where: { lembaga: "iysa" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, role: true, createdAt: true },
  })

  const perluDiperbaiki = penilaiRusak.filter((p) => RUSAK.test(p.name))

  if (perluDiperbaiki.length === 0) {
    console.log("  · nama penilai sudah bersih — dilewati")
  } else if (penilaiRusak.length !== PENILAI_IYSA_URUT.length) {
    console.log(
      `  ✗ ditemukan ${penilaiRusak.length} penilai IYSA, diharapkan ${PENILAI_IYSA_URUT.length}.\n` +
      "    Pemetaan berdasarkan urutan tidak aman. Perbaiki manual lewat halaman Pengaturan."
    )
  } else {
    for (const [i, lama] of penilaiRusak.entries()) {
      const asli = PENILAI_IYSA_URUT[i]
      const cocok = lama.role === asli.role ? "✓" : "⚠ peran tidak cocok"
      console.log(
        `  ${lama.createdAt.toISOString()}  ${lama.name.padEnd(10)} → ${asli.name.padEnd(12)} ${cocok}`
      )
      if (TERAPKAN && RUSAK.test(lama.name)) {
        await prisma.evaluator.update({
          where: { id: lama.id },
          data: { name: asli.name, divisi: asli.divisi, role: asli.role },
        })
      }
    }
  }

  // ── 2. Membuang data palsu ──────────────────────────────────────────────
  judul("2. Data karyawan palsu")

  const palsu = await prisma.employee.findMany({
    where: { lembaga: "iysa" },
    select: { id: true, name: true, createdAt: true },
  })
  const dibuang = palsu.filter((e) => RUSAK.test(e.name))

  if (dibuang.length === 0) {
    console.log("  · tidak ada data palsu — dilewati")
  } else {
    for (const e of dibuang) {
      console.log(`  hapus  ${e.name}  (dibuat ${e.createdAt.toISOString()})`)
      if (TERAPKAN) await prisma.employee.delete({ where: { id: e.id } })
    }
  }

  // ── 3. Mengembalikan karyawan IYSA ──────────────────────────────────────
  judul("3. Karyawan IYSA")

  let dibuat = 0, sudahAda = 0
  for (const k of KARYAWAN_IYSA) {
    const ada = await prisma.employee.findFirst({
      where: { name: k.name, role: k.role, lembaga: "iysa" },
    })
    if (ada) {
      sudahAda++
      continue
    }
    console.log(`  buat   ${k.name.padEnd(22)} ${k.role.padEnd(12)} ${k.divisi ?? "—"}`)
    if (TERAPKAN) {
      await prisma.employee.create({
        data: { name: k.name, role: k.role, divisi: k.divisi, lembaga: "iysa" },
      })
    }
    dibuat++
  }
  console.log(`  → ${dibuat} dibuat, ${sudahAda} sudah ada`)

  // ── 4. Identitas lembaga ────────────────────────────────────────────────
  judul("4. Identitas lembaga dan logo")

  for (const [lembaga, isi] of Object.entries(PENGATURAN)) {
    const kini = await prisma.orgSettings.findUnique({ where: { id: lembaga } })
    if (!kini) {
      console.log(`  · ${lembaga}: belum ada pengaturan — dilewati`)
      continue
    }

    const kolomRusak = Object.entries(kini)
      .filter(([, v]) => typeof v === "string" && RUSAK.test(v))
      .map(([k]) => k)
    const logoRusak = !!kini.logoBase64

    if (kolomRusak.length === 0 && !logoRusak) {
      console.log(`  · ${lembaga}: bersih — dilewati`)
      continue
    }

    console.log(`  ${lembaga}: ${kolomRusak.length} kolom teks dipulihkan, logo dikosongkan`)
    if (TERAPKAN) {
      await prisma.orgSettings.update({
        where: { id: lembaga },
        data: {
          ...isi,
          logoBase64: null,
          kepalaSignatureBase64: null,
          signer2SignatureBase64: null,
          ketuaSignatureBase64: null,
        },
      })
    }
  }

  // ── Ringkasan ───────────────────────────────────────────────────────────
  judul("Keadaan akhir")

  for (const l of ["iysa", "icgi", "iyora"]) {
    const [emp, ev, set] = await Promise.all([
      prisma.employee.count({ where: { lembaga: l } }),
      prisma.evaluator.count({ where: { lembaga: l } }),
      prisma.orgSettings.findUnique({ where: { id: l }, select: { yayasanName: true } }),
    ])
    console.log(`  ${l.padEnd(6)} ${emp} karyawan · ${ev} penilai · "${set?.yayasanName ?? "—"}"`)
  }

  const penilaian = await prisma.evaluation.count({ where: { lembaga: "iysa" } })
  console.log(`\n  Penilaian IYSA yang tersisa: ${penilaian}`)
  if (penilaian === 0) {
    console.log(
      "  ⚠ Angka penilaian kinerja IYSA tidak bisa dipulihkan script ini.\n" +
      "    Satu-satunya jalan adalah point-in-time restore ke sebelum\n" +
      "    31 Agustus 2026 08:34 UTC dari penyedia basis data Anda."
    )
  }

  if (!TERAPKAN) {
    console.log("\n◇ Tidak ada yang diubah. Jalankan ulang dengan --terapkan bila rencana di atas sudah benar.\n")
  } else {
    console.log(
      "\n✓ Pemulihan selesai.\n" +
      "  Langkah berikutnya:\n" +
      "    1. npx tsx prisma/migrate-identity-and-weights.ts   (membangun ulang penugasan)\n" +
      "    2. npx tsx prisma/rotasi-kode-akses.ts --terapkan   (mengganti kode yang bocor)\n" +
      "    3. Unggah ulang logo lewat halaman Pengaturan tiap lembaga\n"
    )
  }
}

main()
  .catch((e) => { console.error("\nPemulihan gagal:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
