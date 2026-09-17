/**
 * Migrasi data: jendela periode lama (tanggal 25–3) menjadi sebulan penuh.
 *
 * Jendela pengisian baku berubah dari "tanggal 25 sampai tanggal 3 bulan
 * berikutnya" menjadi "sepanjang bulannya". Periode yang terlanjur dibuat
 * dengan jendela lama — misalnya September 2026 untuk IYSA, ICGI, dan IYORA,
 * yang membuat ICGI dan IYORA terkunci sebagai draf — disesuaikan di sini.
 *
 * Yang disentuh hanya periode yang:
 *   - milik iysa, icgi, atau iyora;
 *   - masih "draf" atau "dibuka" (yang sudah ditutup/final dibiarkan);
 *   - jendelanya persis pola lama (buka tanggal 25, tutup tanggal 3);
 *   - belum pernah diubah statusnya oleh manusia.
 *
 * Aman dijalankan berulang: setelah disesuaikan, pola lama tidak lagi cocok.
 *
 *   npx tsx prisma/migrate-jendela-bulan-penuh.ts
 */
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import * as path from "path"
import { defaultWindow, statusMenurutJadwal, tanggalWIB } from "../lib/period-format"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

/** Tanggal lama bisa tersimpan dalam UTC atau WIB, tergantung proses pembuatnya. */
function tanggalSalahSatu(t: Date): number[] {
  return [t.getUTCDate(), tanggalWIB(t)]
}

async function main() {
  console.log("\nMigrasi jendela periode → sebulan penuh\n" + "─".repeat(44))

  const periods = await prisma.period.findMany({
    where: { lembaga: { in: ["iysa", "icgi", "iyora"] }, status: { in: ["draf", "dibuka"] } },
    orderBy: [{ lembaga: "asc" }, { year: "asc" }, { month: "asc" }],
  })

  let diubah = 0
  for (const p of periods) {
    const polaLama =
      tanggalSalahSatu(p.opensAt).includes(25) && tanggalSalahSatu(p.closesAt).includes(3)
    if (!polaLama) continue

    const disentuhManusia = await prisma.auditLog.count({
      where: {
        target: p.id,
        action: { in: ["periode.draf", "periode.buka", "periode.buka-kembali", "periode.tutup"] },
        NOT: { actorId: "sistem" },
      },
    })
    if (disentuhManusia > 0) {
      console.log(`  · ${p.id.padEnd(16)} pernah diubah manusia — dibiarkan`)
      continue
    }

    const win = defaultWindow(p.year, p.month)
    const status = statusMenurutJadwal(win.opensAt, win.closesAt)

    await prisma.period.update({
      where: { id: p.id },
      data: { opensAt: win.opensAt, closesAt: win.closesAt, status },
    })
    await prisma.auditLog.create({
      data: {
        actorId: "sistem", actorName: "Sistem",
        action: status === "dibuka" ? "periode.buka" : "periode.buat",
        target: p.id, lembaga: p.lembaga,
        detail: `Jendela ${p.label} disesuaikan ke sebulan penuh (${p.status} → ${status})`,
      },
    })
    console.log(`  ✓ ${p.id.padEnd(16)} ${p.status.padEnd(7)} → ${status}`)
    diubah++
  }

  console.log(diubah === 0 ? "  · tidak ada periode berjendela lama" : `\n  ${diubah} periode disesuaikan`)
  console.log()
}

main()
  .catch((e) => { console.error("\nMigrasi gagal:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
