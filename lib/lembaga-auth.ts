import { cookies } from "next/headers"
import { prisma } from "./prisma"

export type EvaluatorSession = {
  evaluatorId: string
  name: string
  role: string
  lembaga: string
  divisi: string | null
}

export const SESSION_COOKIE = "pa-eval-session"

export async function verifyAccessCode(code: string): Promise<EvaluatorSession | null> {
  const trimmed = code.trim()
  if (!trimmed) return null
  const ev = await prisma.evaluator.findUnique({ where: { accessCode: trimmed } })
  if (!ev) return null
  return {
    evaluatorId: ev.id,
    name: ev.name,
    role: ev.role,
    lembaga: ev.lembaga,
    divisi: ev.divisi,
  }
}

function encodeSession(s: EvaluatorSession): string {
  return Buffer.from(JSON.stringify(s), "utf8").toString("base64")
}

function decodeSession(raw: string): EvaluatorSession | null {
  try {
    const json = Buffer.from(raw, "base64").toString("utf8")
    const obj = JSON.parse(json)
    if (!obj?.evaluatorId || !obj?.lembaga || !obj?.role) return null
    return obj as EvaluatorSession
  } catch {
    return null
  }
}

export async function setSessionCookie(s: EvaluatorSession): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, encodeSession(s), {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<EvaluatorSession | null> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null
  const decoded = decodeSession(raw)
  if (!decoded) return null
  const ev = await prisma.evaluator.findUnique({ where: { id: decoded.evaluatorId } })
  if (!ev || !ev.accessCode) return null
  return {
    evaluatorId: ev.id,
    name: ev.name,
    role: ev.role,
    lembaga: ev.lembaga,
    divisi: ev.divisi,
  }
}
