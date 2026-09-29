import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

/**
 * Ikon dibuat ulang paling sering sekali per jam, sisanya dilayani dari cache.
 *
 * Sebelumnya berkas ini memakai `force-dynamic`. Itu mahal sekali: ikon
 * aplikasi sebenarnya di-cache secara bawaan oleh Next — kecuali memakai
 * dynamic config. Dengan `force-dynamic`, membuka halaman mana pun memanggil
 * satu fungsi server, menulis ke basis data, lalu merender PNG. Terukur
 * 1,4–1,9 detik, pada setiap halaman, hanya untuk gambar yang nyaris tidak
 * pernah berubah.
 */
export const revalidate = 3600

/**
 * Sengaja hanya membaca, tidak lagi `upsert`. Permintaan favicon tidak pantas
 * menulis ke basis data, dan baris OrgSettings sudah dibuat oleh halaman
 * Pengaturan maupun pembuat rapor. Kegagalan basis data tidak boleh
 * menggagalkan build — ikon cukup jatuh ke lambang bawaan.
 */
async function logoTersimpan(): Promise<string | null> {
  try {
    const settings = await prisma.orgSettings.findUnique({
      where: { id: "alfakhir" },
      select: { logoBase64: true },
    })
    return settings?.logoBase64 ?? null
  } catch {
    return null
  }
}

export default async function Icon() {
  const logo = await logoTersimpan()

  if (logo) {
    return new ImageResponse(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        width={64}
        height={64}
        style={{ objectFit: "contain" as const, width: "100%", height: "100%" }}
        alt=""
      />,
      { ...size },
    )
  }

  // Bawaan: lingkaran emas "AF"
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#1C1409",
        fontWeight: "900",
        fontSize: "26px",
        fontFamily: "sans-serif",
        borderRadius: "50%",
      }}
    >
      AF
    </div>,
    { ...size },
  )
}
