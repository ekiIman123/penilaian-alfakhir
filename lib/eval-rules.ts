import type { Section } from "./rubrics"

/**
 * Nilai yang dianggap ekstrem dan wajib disertai catatan.
 *
 * Nilai 3 sengaja tidak termasuk. Nilai ekstrem adalah yang paling berdampak
 * pada orangnya dan paling butuh penjelasan — 1 dan 2 karena menuntut
 * perbaikan, 4 karena mengklaim keistimewaan. Nilai tengah tidak. Aturan ini
 * sekaligus menaikkan ongkos memberi nilai aman secara sembarangan, dan
 * memberi bahan nyata untuk ringkasan catatan yang disusun AI.
 */
export const NILAI_EKSTREM = [1, 2, 4]

export function isEkstrem(nilai: number | null | undefined): boolean {
  return nilai != null && NILAI_EKSTREM.includes(nilai)
}

/** Aspek yang mengandung minimal satu nilai ekstrem, jadi catatannya wajib. */
export function aspekWajibCatatan(
  scores: Record<string, number>,
  sections: Section[],
): Section[] {
  return sections.filter((sec) =>
    sec.criteria.some((c) => isEkstrem(scores[c.id])),
  )
}

export type PemeriksaanCatatan = {
  ok: boolean
  /** Aspek yang butuh catatan tapi masih kosong. */
  kurang: Section[]
}

export function periksaCatatan(
  scores: Record<string, number>,
  catatan: Record<string, string>,
  sections: Section[],
): PemeriksaanCatatan {
  const kurang = aspekWajibCatatan(scores, sections).filter(
    (sec) => !(catatan[sec.id] ?? "").trim(),
  )
  return { ok: kurang.length === 0, kurang }
}

/** Pesan siap tampil untuk aspek yang catatannya belum diisi. */
export function pesanCatatanKurang(kurang: Section[]): string {
  if (kurang.length === 0) return ""
  const nama = kurang.map((s) => s.label.replace(/^[A-G]\. /, "")).join(", ")
  return kurang.length === 1
    ? `Aspek ${nama} punya nilai 1, 2, atau 4 — tulis catatan singkat dulu`
    : `${kurang.length} aspek punya nilai ekstrem dan butuh catatan: ${nama}`
}

/**
 * Pola penilaian yang layak ditunjukkan kembali kepada penilainya sebelum
 * dikirim. Bukan penghalang dan tidak dilaporkan ke siapa pun — hanya cermin,
 * sekali, supaya penilai melihat kebiasaannya sendiri dari luar.
 */
export type Cermin = {
  rataRata: number
  /** Semua kriteria diberi nilai yang sama persis. */
  seragam: boolean
  /** Lebih dari 80% nilai menumpuk di satu angka. */
  menumpuk: number | null
  /** Tidak ada satu pun nilai ekstrem — semuanya aman di tengah. */
  tanpaEkstrem: boolean
}

export function cerminPenilaian(scores: Record<string, number>): Cermin | null {
  const nilai = Object.values(scores).filter((n) => typeof n === "number" && n > 0)
  if (nilai.length === 0) return null

  const rataRata = nilai.reduce((a, b) => a + b, 0) / nilai.length

  const hitung = new Map<number, number>()
  for (const n of nilai) hitung.set(n, (hitung.get(n) ?? 0) + 1)

  let terbanyak: number | null = null
  let jumlahTerbanyak = 0
  for (const [n, j] of hitung) {
    if (j > jumlahTerbanyak) { terbanyak = n; jumlahTerbanyak = j }
  }

  return {
    rataRata,
    seragam: hitung.size === 1,
    menumpuk: jumlahTerbanyak / nilai.length > 0.8 ? terbanyak : null,
    tanpaEkstrem: !nilai.some((n) => NILAI_EKSTREM.includes(n)),
  }
}
