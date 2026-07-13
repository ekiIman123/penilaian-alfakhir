import { prisma } from "./prisma"
import type { EvaluatorSession } from "./lembaga-auth"

export type EvaluateeEmployee = {
  id: string
  name: string
  role: string
  lembaga: string
  divisi: string | null
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

export async function getEvaluatees(
  session: EvaluatorSession,
  currentLembaga?: string
): Promise<EvaluateeEmployee[]> {
  const { role, lembaga } = session

  if (role === "koordinator") {
    const divisiList = parseDivisi(session.divisi)
    if (divisiList.length === 0) return []
    return prisma.employee.findMany({
      where: { lembaga, role: "staff", divisi: { in: divisiList } },
      orderBy: { name: "asc" },
    })
  }

  if (role === "supervisor") {
    return prisma.employee.findMany({
      where: { lembaga: "iysa" },
      orderBy: [{ divisi: "asc" }, { name: "asc" }],
    })
  }

  if (role === "ceo") {
    return prisma.employee.findMany({
      where: { lembaga: "icgi" },
      orderBy: { name: "asc" },
    })
  }

  if (role === "pm") {
    return prisma.employee.findMany({
      where: { lembaga: "iyora" },
      orderBy: { name: "asc" },
    })
  }

  if (role === "founder") {
    const target = currentLembaga ?? lembaga
    if (target === "iysa") {
      return prisma.employee.findMany({
        where: { lembaga: "iysa" },
        orderBy: [{ divisi: "asc" }, { name: "asc" }],
      })
    }
    if (target === "icgi") {
      return prisma.employee.findMany({
        where: { lembaga: "icgi" },
        orderBy: { name: "asc" },
      })
    }
    if (target === "iyora") {
      return prisma.employee.findMany({
        where: { lembaga: "iyora" },
        orderBy: { name: "asc" },
      })
    }
    return []
  }

  if (role === "management") {
    return prisma.employee.findMany({
      where: {
        OR: [
          { lembaga: "iysa", role: { in: ["supervisor", "koordinator"] } },
          { lembaga: "icgi", role: "ceo" },
          { lembaga: "iyora", role: "pm" },
        ],
      },
      orderBy: { name: "asc" },
    })
  }

  return []
}

export function rubricTypeFor(employeeRole: string): "ae" | "ag" {
  return employeeRole === "staff" ? "ae" : "ag"
}
