import { prisma } from "./prisma"

/**
 * Pembatasan percobaan masuk.
 *
 * Kode akses di sistem ini berdiri sendiri — tidak ada kata sandi pendamping.
 * Tanpa pembatasan, seluruh ruang kode bisa dicoba satu per satu oleh script.
 *
 * Hitungannya disimpan di basis data, bukan di memori, karena aplikasi berjalan
 * di lingkungan serverless: setiap permintaan bisa dilayani proses berbeda,
 * sehingga penghitung di memori tidak akan pernah akurat.
 */

/** Batas kegagalan dari satu alamat IP sebelum ditolak sementara. */
const BATAS_GAGAL = 8
/** Rentang waktu penghitungan. */
const JENDELA_MENIT = 15
/** Lama penolakan setelah batas terlampaui. */
const TAHAN_MENIT = 15

export type HasilBatas =
  | { boleh: true }
  | { boleh: false; tungguDetik: number; pesan: string }

/**
 * Alamat IP pemanggil.
 *
 * Di belakang proxy Vercel, alamat asli ada di x-forwarded-for. Yang diambil
 * adalah entri pertama — itulah klien; sisanya adalah rantai proxy.
 */
export function alamatIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip")?.trim() || "tidak diketahui"
}

export async function periksaBatas(ip: string): Promise<HasilBatas> {
  const sejak = new Date(Date.now() - JENDELA_MENIT * 60_000)

  const gagal = await prisma.loginAttempt.findMany({
    where: { ip, berhasil: false, createdAt: { gte: sejak } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: BATAS_GAGAL,
  })

  if (gagal.length < BATAS_GAGAL) return { boleh: true }

  // Penahanan dihitung dari kegagalan terakhir, bukan dari yang pertama —
  // supaya percobaan yang terus berlanjut tidak otomatis lepas begitu saja.
  const terakhir = gagal[0].createdAt.getTime()
  const bebasPada = terakhir + TAHAN_MENIT * 60_000
  const sisa = Math.ceil((bebasPada - Date.now()) / 1000)

  if (sisa <= 0) return { boleh: true }

  return {
    boleh: false,
    tungguDetik: sisa,
    pesan:
      `Terlalu banyak percobaan masuk yang gagal. ` +
      `Coba lagi dalam ${Math.ceil(sisa / 60)} menit.`,
  }
}

export async function catatPercobaan(
  ip: string,
  berhasil: boolean,
  jenis: "penilai" | "karyawan",
): Promise<void> {
  try {
    await prisma.loginAttempt.create({ data: { ip, berhasil, jenis } })

    // Membersihkan catatan lama sesekali, supaya tabel tidak tumbuh tanpa batas.
    // Dijalankan acak agar tidak membebani setiap permintaan.
    if (Math.random() < 0.02) {
      await prisma.loginAttempt.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60_000) } },
      })
    }
  } catch (e) {
    // Gagal mencatat tidak boleh menggagalkan proses masuk itu sendiri.
    console.error("[rate-limit] gagal mencatat percobaan:", e)
  }
}

/** Percobaan gagal terbanyak per IP — untuk ditampilkan bila ada kecurigaan. */
export async function percobaanMencurigakan(jam = 24) {
  const sejak = new Date(Date.now() - jam * 60 * 60_000)
  const rows = await prisma.loginAttempt.groupBy({
    by: ["ip"],
    where: { berhasil: false, createdAt: { gte: sejak } },
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  })
  return rows.map((r) => ({ ip: r.ip, gagal: r._count._all }))
}
