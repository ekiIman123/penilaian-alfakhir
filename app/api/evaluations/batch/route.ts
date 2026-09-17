import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/lembaga-auth"
import { getPeriod } from "@/lib/periods"
import { rubricTypeFor, getEvaluatees } from "@/lib/lembaga-evaluatees"

export const dynamic = "force-dynamic"

type Item = {
  employeeId: string
  scores: Record<string, number>
  catatan?: Record<string, string> | null
  status?: "draf" | "terkirim"
}

/**
 * Menyimpan banyak penilaian sekaligus.
 *
 * Mode per-kriteria menilai satu aspek untuk seluruh tim dalam satu layar, jadi
 * satu ketukan bisa mengubah enam penilaian sekaligus. Mengirimnya satu per
 * satu berarti enam perjalanan jaringan untuk satu tindakan.
 */
export async function POST(req: Request) {
  const { periodId, items } = (await req.json()) as { periodId?: string; items?: Item[] }

  if (!periodId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Data penilaian tidak lengkap" }, { status: 400 })
  }
  if (items.length > 100) {
    return NextResponse.json({ error: "Terlalu banyak penilaian dalam satu kiriman" }, { status: 400 })
  }

  const period = await getPeriod(periodId)
  if (!period) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 })
  if (!period.dapatDinilai) {
    return NextResponse.json(
      { error: `Periode ${period.label} sudah ${period.status} — penilaian tidak bisa diubah` },
      { status: 409 },
    )
  }

  // Sesi diarahkan ke lembaga periode ini, supaya penilaian tercatat atas nama
  // jabatan yang tepat bagi orang yang memegang beberapa jabatan.
  const session = await getSession(period.lembaga)
  if (!session) {
    return NextResponse.json({ error: "Anda tidak punya jabatan di lembaga ini" }, { status: 403 })
  }

  // Hanya karyawan di lembaga periode ini yang boleh dinilai lewat jalur ini.
  const employeeIds = [...new Set(items.map((i) => i.employeeId))]
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, lembaga: period.lembaga },
    select: { id: true, role: true },
  })
  const roleById = new Map(employees.map((e) => [e.id, e.role]))

  const tidakDikenal = employeeIds.filter((id) => !roleById.has(id))
  if (tidakDikenal.length > 0) {
    return NextResponse.json(
      { error: `${tidakDikenal.length} karyawan tidak ada di ${period.lembaga.toUpperCase()}` },
      { status: 400 },
    )
  }

  // Penilai hanya boleh menilai orang yang memang menjadi tugasnya. Tanpa ini,
  // koordinator IT bisa mengisi nilai staf Administrasi dan ikut menggeser
  // rata-rata orang yang bukan bawahannya.
  if (session.evaluatorId !== "superadmin") {
    const bolehDinilai = new Set((await getEvaluatees(session, period.lembaga)).map((e) => e.id))
    const bukanTugas = employeeIds.filter((id) => !bolehDinilai.has(id))
    if (bukanTugas.length > 0) {
      return NextResponse.json(
        { error: `${bukanTugas.length} orang bukan tugas penilaian Anda di ${period.lembaga.toUpperCase()}` },
        { status: 403 },
      )
    }
  }

  const evaluatorId = session.evaluatorId
  let tersimpan = 0
  let terkirim = 0

  await prisma.$transaction(
    items.map((item) => {
      const status = item.status === "terkirim" ? "terkirim" : "draf"
      if (status === "terkirim") terkirim++
      tersimpan++

      const rubricType = rubricTypeFor(roleById.get(item.employeeId)!)
      const catatanBersih = Object.fromEntries(
        Object.entries(item.catatan ?? {}).filter(([, v]) => (v ?? "").trim()),
      )
      const catatan = Object.keys(catatanBersih).length > 0 ? JSON.stringify(catatanBersih) : null

      const isi = {
        scores: JSON.stringify(item.scores),
        catatan,
        rubricType,
        lembaga: period.lembaga,
        status,
        submittedAt: status === "terkirim" ? new Date() : null,
      }

      return prisma.evaluation.upsert({
        where: {
          periodId_evaluatorId_employeeId: { periodId, evaluatorId, employeeId: item.employeeId },
        },
        update: isi,
        create: { periodId, evaluatorId, employeeId: item.employeeId, ...isi },
      })
    }),
  )

  revalidatePath("/")
  return NextResponse.json({ tersimpan, terkirim })
}
