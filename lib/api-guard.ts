import { NextResponse } from "next/server"
import { getSession, type EvaluatorSession } from "./lembaga-auth"
import { isLembaga, bolehKelolaLembaga, bolehKelolaPeriode, peranPuncak } from "./lembaga"

/**
 * Penjaga route API.
 *
 * Latar belakangnya penting: sebelum berkas ini ada, seluruh endpoint yang
 * mengubah data — menambah dan MENGHAPUS karyawan, mengubah pengaturan lembaga,
 * menghapus penilaian — berjalan tanpa pemeriksaan apa pun. Siapa pun di
 * internet yang tahu alamatnya bisa memanggilnya dengan curl, tanpa login,
 * tanpa kode akses. Itulah yang dipakai untuk merusak data IYSA pada
 * 31 Agustus 2026.
 *
 * Aturannya sekarang: setiap route yang menyentuh data harus melewati salah
 * satu penjaga di bawah. Yang membaca pun dijaga — daftar karyawan dan rapor
 * adalah data pribadi orang, bukan informasi publik.
 */

export type HasilJaga =
  | { ok: true; session: EvaluatorSession }
  | { ok: false; response: NextResponse }

function tolak(pesan: string, status: number): HasilJaga {
  return { ok: false, response: NextResponse.json({ error: pesan }, { status }) }
}

/** Cukup sudah masuk sebagai penilai di lembaga tersebut. */
export async function jagaLembaga(lembagaSlug: string): Promise<HasilJaga> {
  if (!isLembaga(lembagaSlug)) return tolak("Lembaga tidak dikenal", 404)

  const session = await getSession(lembagaSlug)
  if (!session) return tolak("Anda harus masuk terlebih dahulu", 401)
  return { ok: true, session }
}

/** Perlu peran yang boleh mengelola periode: supervisor, CEO, PM, manajemen. */
export async function jagaPengelola(lembagaSlug: string): Promise<HasilJaga> {
  const hasil = await jagaLembaga(lembagaSlug)
  if (!hasil.ok) return hasil
  if (!bolehKelolaPeriode(hasil.session.role)) {
    return tolak("Peran Anda tidak punya wewenang untuk tindakan ini", 403)
  }
  return hasil
}

/**
 * Perlu wewenang mengubah data anggota dan pengaturan lembaga.
 * CEO dan PM adalah pemimpin tunggal di lembaganya, jadi setara supervisor.
 */
export async function jagaPengaturan(lembagaSlug: string): Promise<HasilJaga> {
  const hasil = await jagaLembaga(lembagaSlug)
  if (!hasil.ok) return hasil

  const { role } = hasil.session
  const boleh =
    bolehKelolaLembaga(role) ||
    (role === "ceo" && lembagaSlug === "icgi") ||
    (role === "pm" && lembagaSlug === "iyora")

  if (!boleh) return tolak("Peran Anda tidak bisa mengubah data ini", 403)
  return hasil
}

/** Hanya manajemen puncak — untuk tindakan yang menyentuh lintas lembaga. */
export async function jagaPuncak(lembagaSlug: string): Promise<HasilJaga> {
  const hasil = await jagaLembaga(lembagaSlug)
  if (!hasil.ok) return hasil
  if (!peranPuncak(hasil.session.role)) {
    return tolak("Hanya manajemen yang bisa melakukan ini", 403)
  }
  return hasil
}

/**
 * Penjaga untuk alur lama Al Fakhir, yang tidak punya lembaga di alamatnya.
 * Cukup memastikan ada sesi yang sah — siapa pun yang sudah masuk.
 */
export async function jagaMasuk(): Promise<HasilJaga> {
  const session = await getSession()
  if (!session) return tolak("Anda harus masuk terlebih dahulu", 401)
  return { ok: true, session }
}
