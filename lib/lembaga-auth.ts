import { cookies } from "next/headers"
import { prisma } from "./prisma"
import { buatToken, bacaToken } from "./session-token"

/** Satu jabatan yang dipegang seseorang di satu lembaga. */
export type Hat = {
  evaluatorId: string
  lembaga: string
  role: string
  divisi: string | null
}

/**
 * Identitas orang yang sedang masuk, lengkap dengan semua jabatannya.
 *
 * Kamal supervisor IYSA sekaligus CEO ICGI; Pak Deni dan Bu Anggraini
 * manajemen di ketiga lembaga. Dulu itu berarti dua sampai tiga kode akses
 * dan keluar-masuk aplikasi tiap bulan. Sekarang satu kali masuk, semua
 * jabatan terbawa.
 */
export type AccountSession = {
  accountId: string
  name: string
  isSuperadmin: boolean
  hats: Hat[]
}

/** Sesi yang sudah diarahkan ke satu lembaga — bentuk yang dipakai halaman. */
export type EvaluatorSession = {
  evaluatorId: string
  name: string
  role: string
  lembaga: string
  divisi: string | null
  /** Lembaga lain yang juga bisa dibuka orang ini tanpa masuk ulang. */
  lembagaLain: string[]
}

export const SESSION_COOKIE = "pa-eval-session"
export const EMPLOYEE_COOKIE = "pa-emp-session"

const SUPERADMIN_ID = "superadmin"

function superadminCode(): string {
  return process.env.SUPERADMIN_CODE?.trim() || "semogabahagia"
}

// Penyandian token ada di lib/session-token.ts supaya middleware yang berjalan
// di Edge Runtime dapat memeriksa tanda tangan yang sama tanpa Prisma.

// ── Masuk ─────────────────────────────────────────────────────────────────

/**
 * Menukar kode akses dengan identitas.
 *
 * Kode lama tiap jabatan tetap berlaku — tidak ada yang perlu menghafal kode
 * baru. Kode mana pun milik seseorang mengantar ke identitas yang sama, dan
 * membawa serta seluruh jabatannya.
 */
export async function verifyAccessCode(code: string): Promise<AccountSession | null> {
  const trimmed = code.trim()
  if (!trimmed) return null

  if (trimmed.toLowerCase() === superadminCode().toLowerCase()) {
    return { accountId: SUPERADMIN_ID, name: "Super Admin", isSuperadmin: true, hats: [] }
  }

  const akun = await prisma.account.findUnique({
    where: { accessCode: trimmed },
    include: { evaluators: true },
  })
  if (akun) return toAccountSession(akun)

  // Kode jabatan lama — tetap diterima, lalu diarahkan ke akunnya.
  const ev = await prisma.evaluator.findUnique({
    where: { accessCode: trimmed },
    include: { account: { include: { evaluators: true } } },
  })
  if (!ev) return null

  if (ev.account) return toAccountSession(ev.account)

  // Penilai yang belum punya akun (mis. baru ditambahkan lewat Pengaturan).
  return {
    accountId: `ev:${ev.id}`,
    name: ev.name,
    isSuperadmin: false,
    hats: [{ evaluatorId: ev.id, lembaga: ev.lembaga, role: ev.role, divisi: ev.divisi }],
  }
}

type AkunDenganJabatan = {
  id: string
  name: string
  isSuperadmin: boolean
  evaluators: { id: string; lembaga: string; role: string; divisi: string | null }[]
}

function toAccountSession(a: AkunDenganJabatan): AccountSession {
  return {
    accountId: a.id,
    name: a.name,
    isSuperadmin: a.isSuperadmin,
    hats: a.evaluators.map((e) => ({
      evaluatorId: e.id,
      lembaga: e.lembaga,
      role: e.role,
      divisi: e.divisi,
    })),
  }
}

// ── Cookie ────────────────────────────────────────────────────────────────

export async function setSessionCookie(s: AccountSession): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, await buatToken(s.accountId), {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  store.delete(EMPLOYEE_COOKIE)
}

// ── Membaca sesi ──────────────────────────────────────────────────────────

export async function getAccountSession(): Promise<AccountSession | null> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null

  const accountId = await bacaToken(raw)
  if (!accountId) return null

  if (accountId === SUPERADMIN_ID) {
    return { accountId: SUPERADMIN_ID, name: "Super Admin", isSuperadmin: true, hats: [] }
  }

  // Penilai tanpa akun — ditandai dengan awalan "ev:".
  if (accountId.startsWith("ev:")) {
    const ev = await prisma.evaluator.findUnique({ where: { id: accountId.slice(3) } })
    if (!ev || !ev.accessCode) return null
    return {
      accountId,
      name: ev.name,
      isSuperadmin: false,
      hats: [{ evaluatorId: ev.id, lembaga: ev.lembaga, role: ev.role, divisi: ev.divisi }],
    }
  }

  const akun = await prisma.account.findUnique({
    where: { id: accountId },
    include: { evaluators: true },
  })
  return akun ? toAccountSession(akun) : null
}

/**
 * Sesi yang sudah diarahkan ke satu lembaga.
 *
 * Tanpa argumen, mengembalikan jabatan pertama — dipakai halaman yang belum
 * tahu lembaga mana yang dibuka. Dengan argumen, mengembalikan jabatan orang
 * ini di lembaga tersebut, atau null kalau ia tidak punya jabatan di sana.
 */
export async function getSession(lembaga?: string): Promise<EvaluatorSession | null> {
  const akun = await getAccountSession()
  if (!akun) return null

  const lembagaLain = akun.hats.map((h) => h.lembaga)

  if (akun.isSuperadmin) {
    return {
      evaluatorId: SUPERADMIN_ID,
      name: akun.name,
      role: "superadmin",
      lembaga: "all",
      divisi: null,
      lembagaLain,
    }
  }

  const hat = lembaga
    ? akun.hats.find((h) => h.lembaga === lembaga)
    : akun.hats[0]
  if (!hat) return null

  return {
    evaluatorId: hat.evaluatorId,
    name: akun.name,
    role: hat.role,
    lembaga: hat.lembaga,
    divisi: hat.divisi,
    lembagaLain,
  }
}

// ── Sesi karyawan ─────────────────────────────────────────────────────────

export type EmployeeSession = {
  employeeId: string
  name: string
  lembaga: string
  role: string
  divisi: string | null
}

export async function verifyEmployeeCode(code: string): Promise<EmployeeSession | null> {
  const trimmed = code.trim()
  if (!trimmed) return null
  const emp = await prisma.employee.findUnique({ where: { accessCode: trimmed } })
  if (!emp) return null
  return {
    employeeId: emp.id,
    name: emp.name,
    lembaga: emp.lembaga,
    role: emp.role,
    divisi: emp.divisi,
  }
}

export async function setEmployeeCookie(s: EmployeeSession): Promise<void> {
  const store = await cookies()
  store.set(EMPLOYEE_COOKIE, await buatToken(s.employeeId), {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const store = await cookies()
  const raw = store.get(EMPLOYEE_COOKIE)?.value
  if (!raw) return null
  const employeeId = await bacaToken(raw)
  if (!employeeId) return null
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!emp || !emp.accessCode) return null
  return {
    employeeId: emp.id,
    name: emp.name,
    lembaga: emp.lembaga,
    role: emp.role,
    divisi: emp.divisi,
  }
}
