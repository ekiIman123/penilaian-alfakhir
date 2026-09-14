/**
 * Penyusun pesan pengingat — murni teks, tanpa sentuhan database, sehingga
 * aman diimpor komponen klien.
 */
/**
 * Pesan pengingat siap kirim.
 *
 * WhatsApp adalah saluran yang paling realistis di sini, dan versi paling
 * sederhana yang benar-benar dipakai orang adalah tombol yang menyiapkan
 * pesannya — bukan langganan layanan pengiriman pesan.
 */
export function pesanPengingat(input: {
  nama: string
  lembaga: string
  periodLabel: string
  belum: number
  sisaHari: number | null
  tautan: string
}): string {
  const { nama, lembaga, periodLabel, belum, sisaHari, tautan } = input
  const waktu =
    sisaHari === null ? ""
    : sisaHari > 1 ? ` Pengisian ditutup ${sisaHari} hari lagi.`
    : sisaHari === 1 ? " Pengisian ditutup besok."
    : sisaHari === 0 ? " Pengisian ditutup hari ini."
    : " Pengisian sudah lewat tenggat."

  return (
    `Halo ${nama}, mohon bantuannya untuk melengkapi penilaian kinerja ` +
    `${lembaga.toUpperCase()} periode ${periodLabel}. ` +
    `Masih ada ${belum} orang yang belum dinilai.${waktu}\n\n` +
    `Bisa diisi di sini: ${tautan}\n\nTerima kasih.`
  )
}

/** Nomor Indonesia dirapikan ke bentuk yang diterima wa.me (62…). */
export function normalkanNomor(phone: string | null): string | null {
  if (!phone) return null
  const angka = phone.replace(/\D/g, "")
  if (!angka) return null
  if (angka.startsWith("62")) return angka
  if (angka.startsWith("0")) return `62${angka.slice(1)}`
  if (angka.startsWith("8")) return `62${angka}`
  return angka
}
