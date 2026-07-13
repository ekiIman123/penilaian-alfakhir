import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"
export const dynamic = "force-dynamic"

export default async function Icon() {
  const settings = await prisma.orgSettings.upsert({
    where: { id: "alfakhir" },
    create: { id: "alfakhir" },
    update: {},
  })

  if (settings.logoBase64) {
    return new ImageResponse(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={settings.logoBase64}
        width={64}
        height={64}
        style={{ objectFit: "contain" as const, width: "100%", height: "100%" }}
        alt=""
      />,
      { ...size },
    )
  }

  // Default: gold "AF" circle
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
