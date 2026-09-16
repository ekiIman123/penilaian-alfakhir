/**
 * Penyandian dan pemeriksaan token sesi.
 *
 * Dipisah dari lib/lembaga-auth.ts karena middleware berjalan di Edge Runtime
 * yang tidak punya `node:crypto` maupun Prisma. Berkas ini hanya memakai Web
 * Crypto API, yang tersedia di Edge maupun Node 18+, sehingga tanda tangan yang
 * sama bisa diperiksa di kedua tempat.
 */

const enc = new TextEncoder()

const CADANGAN_PENGEMBANGAN = "pa-dev-secret-hanya-untuk-lokal"

function rahasia(): string {
  const dariEnv = process.env.SESSION_SECRET?.trim()
  if (dariEnv && dariEnv.length >= 24) return dariEnv

  // Di produksi, berjalan dengan nilai cadangan berarti tanda tangan sesi bisa
  // disusun siapa pun yang membaca kode sumber. Lebih baik menolak melayani
  // daripada melayani dengan pengamanan yang hanya tampak ada.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET belum diisi (minimal 24 karakter). " +
      "Isi di Environment Variables sebelum aplikasi dijalankan di produksi."
    )
  }

  return CADANGAN_PENGEMBANGAN
}

function base64url(buf: ArrayBuffer): string {
  let s = ""
  const b = new Uint8Array(buf)
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function dariBase64url(s: string): string {
  const p = s.replace(/-/g, "+").replace(/_/g, "/")
  return atob(p + "=".repeat((4 - (p.length % 4)) % 4))
}

async function kunci(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(rahasia()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

async function tandaTangan(payload: string): Promise<string> {
  const k = await kunci()
  return base64url(await crypto.subtle.sign("HMAC", k, enc.encode(payload)))
}

/** Menyusun token bertanda tangan untuk sebuah id. */
export async function buatToken(id: string): Promise<string> {
  const payload = base64url(enc.encode(JSON.stringify({ id })).buffer as ArrayBuffer)
  return `${payload}.${await tandaTangan(payload)}`
}

/**
 * Memeriksa tanda tangan lalu mengembalikan id di dalamnya.
 * Mengembalikan null bila token dirusak, dipalsukan, atau bentuknya salah.
 */
export async function bacaToken(raw: string | undefined | null): Promise<string | null> {
  if (!raw) return null
  const titik = raw.lastIndexOf(".")
  if (titik <= 0) return null

  const payload = raw.slice(0, titik)
  const tanda = raw.slice(titik + 1)

  const k = await kunci()
  let sah: boolean
  try {
    const bytes = Uint8Array.from(dariBase64url(tanda), (c) => c.charCodeAt(0))
    sah = await crypto.subtle.verify("HMAC", k, bytes, enc.encode(payload))
  } catch {
    return null
  }
  if (!sah) return null

  try {
    const obj = JSON.parse(dariBase64url(payload))
    return typeof obj?.id === "string" ? obj.id : null
  } catch {
    return null
  }
}
