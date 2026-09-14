/**
 * Bobot penilai.
 *
 * Sebelumnya semua penilai berbobot sama: staff IYSA yang dinilai koordinator
 * dan supervisor mendapat rata-rata 50–50. Padahal atasan langsung melihat
 * kerja harian, sementara manajemen melihat dari jauh — meski justru melihat
 * lintas lembaga sehingga ukurannya lebih konsisten antar orang.
 *
 * Bobot di bawah mencerminkan kedekatan dengan pekerjaan harian. Angkanya
 * relatif, bukan persentase: yang dipakai adalah perbandingan antar penilai
 * yang benar-benar mengisi. Staff yang dinilai koordinator (1,0) dan
 * supervisor (0,7) menghasilkan pembagian sekitar 59% dan 41%.
 *
 * Bobot per pasangan bisa ditimpa lewat `Assignment.weight` di layar
 * Penugasan, kalau ada keadaan khusus.
 */
export const BOBOT_PERAN: Record<string, number> = {
  koordinator: 1.0,
  supervisor:  0.7,
  ceo:         0.7,
  pm:          0.7,
  management:  0.5,
  founder:     0.5,
  superadmin:  0.5,
}

export const BOBOT_BAKU = 1.0

export function bobotUntukPeran(role: string): number {
  return BOBOT_PERAN[role] ?? BOBOT_BAKU
}

/**
 * Rata-rata tertimbang. Penilai yang tidak mengisi tidak ikut sama sekali —
 * bukan dihitung nol — supaya kelalaian atasan tidak menjadi angka merah
 * bawahannya.
 */
export function rataTertimbang(
  nilai: { nilai: number; bobot: number }[],
): number | null {
  const dipakai = nilai.filter((n) => n.bobot > 0)
  if (dipakai.length === 0) return null
  const totalBobot = dipakai.reduce((a, b) => a + b.bobot, 0)
  if (totalBobot === 0) return null
  return dipakai.reduce((a, b) => a + b.nilai * b.bobot, 0) / totalBobot
}

/** Bagian tiap penilai dalam persen, untuk ditampilkan apa adanya ke pengguna. */
export function porsiBobot(
  penilai: { id: string; bobot: number }[],
): Record<string, number> {
  const total = penilai.reduce((a, b) => a + b.bobot, 0)
  if (total === 0) return {}
  return Object.fromEntries(penilai.map((p) => [p.id, Math.round((p.bobot / total) * 100)]))
}
