import { prisma } from "./prisma"

/**
 * Jejak tindakan yang tidak boleh hilang.
 *
 * Yang dicatat adalah hal-hal yang mengubah kesepakatan: membuka kembali
 * periode yang sudah ditutup, menerbitkan dan menarik rapor, mengubah bobot
 * penilai. Penilaian sehari-hari tidak dicatat di sini — itu sudah punya
 * jejaknya sendiri lewat kolom updatedAt.
 */
export type AksiAudit =
  | "periode.buka"
  | "periode.draf"
  | "periode.tutup"
  | "periode.buka-kembali"
  | "periode.terbitkan"
  | "periode.tarik"
  | "periode.buat"
  | "penugasan.ubah"
  | "penugasan.hapus"
  | "penilaian.hapus"
  | "karyawan.hapus"
  | "penilai.hapus"
  | "pengaturan.ubah"

export const LABEL_AKSI: Record<AksiAudit, string> = {
  "periode.buka":         "membuka periode",
  "periode.draf":         "mengembalikan periode ke draf",
  "periode.tutup":        "menutup pengisian",
  "periode.buka-kembali": "membuka kembali periode yang sudah ditutup",
  "periode.terbitkan":    "menerbitkan rapor",
  "periode.tarik":        "menarik rapor yang sudah terbit",
  "periode.buat":         "membuat periode",
  "penugasan.ubah":       "mengubah penugasan",
  "penugasan.hapus":      "menghapus penugasan",
  "penilaian.hapus":      "menghapus penilaian",
  "karyawan.hapus":       "menghapus karyawan",
  "penilai.hapus":        "menghapus penilai",
  "pengaturan.ubah":      "mengubah pengaturan lembaga",
}

export async function catatAudit(input: {
  actorId: string
  actorName: string
  action: AksiAudit
  target: string
  lembaga?: string | null
  detail?: string | null
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        target: input.target,
        lembaga: input.lembaga ?? null,
        detail: input.detail ?? null,
      },
    })
  } catch (e) {
    // Gagal mencatat jejak tidak boleh menggagalkan tindakannya sendiri.
    console.error("[audit] gagal mencatat:", e)
  }
}

export async function riwayatAudit(lembaga: string, batas = 50) {
  return prisma.auditLog.findMany({
    where: { lembaga },
    orderBy: { createdAt: "desc" },
    take: batas,
  })
}
