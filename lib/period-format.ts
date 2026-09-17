/**
 * Bagian periode yang murni perhitungan — tanpa sentuhan database, sehingga
 * aman diimpor komponen klien. Yang butuh database ada di `lib/periods.ts`.
 */
export const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const

/**
 * Status periode — urutannya adalah alur siklus bulanan:
 *
 *   draf → dibuka → ditutup → final
 *
 * Hanya periode "dibuka" yang menerima penilaian baru atau perubahan.
 */
export const PERIOD_STATUS = {
  draf: {
    label: "Draf",
    desc: "Belum dibuka. Penilai belum bisa mengisi.",
    color: "#64748B", bg: "#F1F5F9",
    dapatDinilai: false,
  },
  dibuka: {
    label: "Dibuka",
    desc: "Jendela pengisian sedang berjalan.",
    color: "#15803D", bg: "#DCFCE7",
    dapatDinilai: true,
  },
  ditutup: {
    label: "Ditutup",
    desc: "Nilai terkunci, menunggu kalibrasi dan penerbitan rapor.",
    color: "#B45309", bg: "#FEF3C7",
    dapatDinilai: false,
  },
  final: {
    label: "Final",
    desc: "Rapor sudah terbit dan angkanya dibekukan.",
    color: "#1E3A8A", bg: "#DBEAFE",
    dapatDinilai: false,
  },
} as const

export type PeriodStatus = keyof typeof PERIOD_STATUS

export const STATUS_URUTAN: PeriodStatus[] = ["draf", "dibuka", "ditutup", "final"]

export function isPeriodStatus(v: string): v is PeriodStatus {
  return v in PERIOD_STATUS
}

export function periodIdFor(lembaga: string, year: number, month: number): string {
  return `${lembaga}-${year}-${String(month).padStart(2, "0")}`
}

export function monthLabel(year: number, month: number): string {
  return `${BULAN[month - 1]} ${year}`
}

/** Label pendek untuk pemilih periode di navigasi, mis. "Sep 2026". */
export function shortLabel(year: number, month: number): string {
  return `${BULAN[month - 1].slice(0, 3)} ${year}`
}

/**
 * Semua tanggal periode dihitung dalam WIB (UTC+7), bukan zona waktu server.
 *
 * Sebelumnya tanggal dibentuk dengan `new Date(tahun, bulan, tanggal)`, yang
 * mengikuti zona waktu proses: di Vercel (UTC) dan di laptop pengembang (WIB)
 * hasilnya berselisih tujuh jam — periode yang dibuat di Vercel baru terbuka
 * pukul 07:00 WIB dan tenggatnya molor sampai 06:59 WIB keesokan harinya.
 * Indonesia tidak memakai waktu musim panas, jadi selisih tetap tujuh jam.
 */
const SELISIH_WIB_JAM = 7

/** Membentuk satu titik waktu dari tanggal dan jam dalam WIB. */
export function waktuWIB(
  year: number, month: number, day: number,
  jam = 0, menit = 0, detik = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, jam - SELISIH_WIB_JAM, menit, detik))
}

/** Tahun dan bulan yang sedang berjalan menurut WIB. */
export function bulanWIB(now: Date = new Date()): { year: number; month: number } {
  const geser = new Date(now.getTime() + SELISIH_WIB_JAM * 3_600_000)
  return { year: geser.getUTCFullYear(), month: geser.getUTCMonth() + 1 }
}

/** Nomor tanggal (1–31) sebuah titik waktu menurut WIB. */
export function tanggalWIB(t: Date): number {
  return new Date(t.getTime() + SELISIH_WIB_JAM * 3_600_000).getUTCDate()
}

/**
 * Jendela pengisian baku: sepanjang bulan periodenya, tanggal 1 pukul 00:00
 * sampai hari terakhir pukul 23:59:59 WIB.
 *
 * Tidak ada celah antar bulan dan tidak ada tumpang tindih: setiap saat, tepat
 * satu periode bulan berjalan yang terbuka. Penilai bisa mencicil sepanjang
 * bulan — draf tersimpan otomatis — dan penilaian yang terlambat ditangani
 * lewat "Buka kembali" di layar Kelola Periode.
 */
export function defaultWindow(year: number, month: number): { opensAt: Date; closesAt: Date } {
  const hariTerakhir = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    opensAt:  waktuWIB(year, month, 1, 0, 0, 0),
    closesAt: waktuWIB(year, month, hariTerakhir, 23, 59, 59),
  }
}

/** Status yang semestinya menurut jadwal, pada saat tertentu. */
export function statusMenurutJadwal(
  opensAt: Date, closesAt: Date, now: Date = new Date(),
): "draf" | "dibuka" | "ditutup" {
  if (now < opensAt) return "draf"
  if (now > closesAt) return "ditutup"
  return "dibuka"
}

/** Menambahkan ?periode=... ke sebuah alamat, kecuali periodenya sudah aktif. */
export function withPeriod(href: string, periodId: string, activeId?: string): string {
  if (periodId === activeId) return href
  const sep = href.includes("?") ? "&" : "?"
  return `${href}${sep}periode=${encodeURIComponent(periodId)}`
}
