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
 * Jendela pengisian baku: tanggal 25 bulan berjalan sampai tanggal 3 bulan
 * berikutnya — mengambil momen akhir bulan saat pekerjaan masih segar diingat.
 * Tanggalnya bisa digeser lewat layar Kelola Periode.
 */
export function defaultWindow(year: number, month: number): { opensAt: Date; closesAt: Date } {
  return {
    opensAt:  new Date(year, month - 1, 25, 0, 0, 0),
    closesAt: new Date(year, month, 3, 23, 59, 59),
  }
}

/** Menambahkan ?periode=... ke sebuah alamat, kecuali periodenya sudah aktif. */
export function withPeriod(href: string, periodId: string, activeId?: string): string {
  if (periodId === activeId) return href
  const sep = href.includes("?") ? "&" : "?"
  return `${href}${sep}periode=${encodeURIComponent(periodId)}`
}
