import { prisma } from "./prisma"
import type { EvaluatorSession } from "./lembaga-auth"

export type EvaluateeEmployee = {
  id: string
  name: string
  role: string
  lembaga: string
  divisi: string | null
  finalCatatan: string | null
}

function parseDivisi(divisi: string | null): string[] {
  if (!divisi) return []
  try {
    const parsed = JSON.parse(divisi)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Siapa yang boleh dinilai seorang penilai.
 *
 * Penugasan di tabel `Assignment` adalah sumber kebenaran: menambah koordinator
 * baru atau memindahkan seorang staff cukup dilakukan lewat layar Penugasan,
 * tanpa mengubah kode. Aturan peran di bawah tetap dipertahankan sebagai
 * jaring pengaman — kalau penugasan seseorang belum pernah dibuat, ia tidak
 * mendadak kehilangan seluruh daftar bawahannya.
 */
export async function getEvaluatees(
  session: EvaluatorSession,
  currentLembaga?: string
): Promise<EvaluateeEmployee[]> {
  const { role, lembaga } = session

  if (session.evaluatorId !== "superadmin") {
    const target = currentLembaga && currentLembaga !== "all" ? currentLembaga : lembaga
    const ditugaskan = await prisma.assignment.findMany({
      where: {
        evaluatorId: session.evaluatorId,
        lembaga: target,
        OR: [{ activeTo: null }, { activeTo: { gt: new Date() } }],
      },
      include: {
        employee: {
          select: { id: true, name: true, role: true, lembaga: true, divisi: true, finalCatatan: true },
        },
      },
    })
    if (ditugaskan.length > 0) {
      const selfName = session.name.trim().toLowerCase()
      return ditugaskan
        .map((a) => a.employee)
        .filter((e) => e.name.trim().toLowerCase() !== selfName)
        .sort((a, b) =>
          (a.divisi ?? "").localeCompare(b.divisi ?? "") || a.name.localeCompare(b.name)
        )
    }
  }

  // Prevent self-evaluation: exclude employee whose name matches the evaluator (case-insensitive, trimmed)
  const selfName = session.name.trim().toLowerCase()
  function excludeSelf(list: EvaluateeEmployee[]): EvaluateeEmployee[] {
    return list.filter((e) => e.name.trim().toLowerCase() !== selfName)
  }

  if (role === "superadmin") {
    const target = currentLembaga
    if (!target || target === "all") return []
    return excludeSelf(await prisma.employee.findMany({
      where: { lembaga: target },
      orderBy: [{ divisi: "asc" }, { name: "asc" }],
    }))
  }

  if (role === "koordinator") {
    const divisiList = parseDivisi(session.divisi)
    if (divisiList.length === 0) return []
    return excludeSelf(await prisma.employee.findMany({
      where: { lembaga, role: "staff", divisi: { in: divisiList } },
      orderBy: { name: "asc" },
    }))
  }

  if (role === "supervisor") {
    return excludeSelf(await prisma.employee.findMany({
      where: { lembaga: "iysa" },
      orderBy: [{ divisi: "asc" }, { name: "asc" }],
    }))
  }

  if (role === "ceo") {
    return excludeSelf(await prisma.employee.findMany({
      where: { lembaga: "icgi" },
      orderBy: { name: "asc" },
    }))
  }

  if (role === "pm") {
    return excludeSelf(await prisma.employee.findMany({
      where: { lembaga: "iyora" },
      orderBy: { name: "asc" },
    }))
  }

  if (role === "founder") {
    const target = currentLembaga ?? lembaga
    if (target === "iysa") {
      return excludeSelf(await prisma.employee.findMany({
        where: { lembaga: "iysa" },
        orderBy: [{ divisi: "asc" }, { name: "asc" }],
      }))
    }
    if (target === "icgi") {
      return excludeSelf(await prisma.employee.findMany({
        where: { lembaga: "icgi" },
        orderBy: { name: "asc" },
      }))
    }
    if (target === "iyora") {
      return excludeSelf(await prisma.employee.findMany({
        where: { lembaga: "iyora" },
        orderBy: { name: "asc" },
      }))
    }
    return []
  }

  if (role === "management") {
    return excludeSelf(await prisma.employee.findMany({
      where: {
        OR: [
          { lembaga: "iysa", role: { in: ["supervisor", "koordinator"] } },
          { lembaga: "icgi", role: "ceo" },
          { lembaga: "iyora", role: "pm" },
        ],
      },
      orderBy: { name: "asc" },
    }))
  }

  return []
}

export function rubricTypeFor(employeeRole: string): "ae" | "ag" {
  return employeeRole === "staff" ? "ae" : "ag"
}
