import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/lembaga-auth"
import { ensurePeriod, getPeriod, PERIOD_STATUS, isPeriodStatus } from "@/lib/periods"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { isLembaga } from "@/lib/lembaga"

/**
 * Periode untuk alur lama Al Fakhir, yang belum mengenal siklus bulanan.
 * Dibuatkan sekali supaya penilaian di sana tetap punya induk periode.
 */
async function legacyPeriodId(): Promise<string> {
  const now = new Date()
  const p = await ensurePeriod("alfakhir", now.getFullYear(), now.getMonth() + 1, "dibuka")
  return p.id
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const evaluatorId = searchParams.get("evaluatorId")
  const teacherId = searchParams.get("teacherId")
  const periodId = searchParams.get("periodId") ?? (await legacyPeriodId())

  if (!evaluatorId || !teacherId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { periodId_evaluatorId_employeeId: { periodId, evaluatorId, employeeId: teacherId } },
  })

  if (!evaluation) return NextResponse.json(null)

  return NextResponse.json({
    id: evaluation.id,
    scores: JSON.parse(evaluation.scores as string),
    catatan: evaluation.catatan,
    status: evaluation.status,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { evaluatorId, teacherId, scores, catatan, rubricType } = body

    if (!evaluatorId || !teacherId || !scores) {
      return NextResponse.json({ error: "Data penilaian tidak lengkap" }, { status: 400 })
    }

    // Draf disimpan otomatis sambil mengisi; "terkirim" mengunci dan
    // memasukkannya ke rata-rata yang dilihat penilai lain.
    const status: "draf" | "terkirim" = body.status === "terkirim" ? "terkirim" : "draf"

    const rt: string = typeof rubricType === "string" ? rubricType : "standard"

    let lb = "alfakhir"
    if (rt === "ae" || rt === "ag") {
      const emp = await prisma.employee.findUnique({
        where: { id: teacherId },
        select: { lembaga: true },
      })
      lb = emp?.lembaga ?? "alfakhir"
    }

    // Penilai hanya boleh menyimpan atas namanya sendiri. Alur lama Al Fakhir
    // berjalan tanpa sesi, jadi pemeriksaan ini hanya berlaku bila sesi ada.
    const session = await getSession(lb)
    if (session && session.evaluatorId !== "superadmin" && session.evaluatorId !== evaluatorId) {
      return NextResponse.json(
        { error: "Anda hanya bisa menyimpan penilaian atas nama sendiri" },
        { status: 403 },
      )
    }

    // Untuk alur lembaga, orang yang dinilai harus memang tugas penilai ini.
    if (session && session.evaluatorId !== "superadmin" && isLembaga(lb)) {
      const bolehDinilai = await getEvaluatees(session, lb)
      if (!bolehDinilai.some((e) => e.id === teacherId)) {
        return NextResponse.json(
          { error: "Orang ini bukan tugas penilaian Anda" },
          { status: 403 },
        )
      }
    }

    // Periode: dari badan permintaan, atau periode berjalan untuk alur lama.
    const periodId: string =
      typeof body.periodId === "string" && body.periodId ? body.periodId : await legacyPeriodId()

    const period = await getPeriod(periodId)
    if (!period) {
      return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 })
    }
    if (period.lembaga !== lb) {
      return NextResponse.json(
        { error: `Periode ${period.label} bukan milik lembaga ${lb.toUpperCase()}` },
        { status: 400 },
      )
    }
    if (!period.dapatDinilai) {
      const info = isPeriodStatus(period.status) ? PERIOD_STATUS[period.status] : null
      return NextResponse.json(
        { error: `Periode ${period.label} sudah ${info?.label.toLowerCase() ?? period.status}. ${info?.desc ?? ""}`.trim() },
        { status: 409 },
      )
    }

    const result = await prisma.evaluation.upsert({
      where: { periodId_evaluatorId_employeeId: { periodId, evaluatorId, employeeId: teacherId } },
      update: {
        scores: JSON.stringify(scores),
        catatan: catatan ?? null,
        rubricType: rt,
        lembaga: lb,
        status,
        submittedAt: status === "terkirim" ? new Date() : null,
      },
      create: {
        periodId,
        evaluatorId,
        employeeId: teacherId,
        scores: JSON.stringify(scores),
        catatan: catatan ?? null,
        rubricType: rt,
        lembaga: lb,
        status,
        submittedAt: status === "terkirim" ? new Date() : null,
      },
      include: { evaluator: true, employee: true },
    })

    revalidatePath("/")
    return NextResponse.json(result, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
