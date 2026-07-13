import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "@/lib/prisma"
import { getSectionsForRole, getScoreGrade } from "@/lib/rubrics"
import { parseScores, calcTotal } from "@/lib/calculations"
import { ReportDocument, type ReportData } from "@/components/pdf/report-document"

export const dynamic = "force-dynamic"

async function summarizeCatatan(
  catatan: { evaluatorName: string; text: string }[],
): Promise<string | null> {
  if (catatan.length === 0) return null
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const catatanText = catatan
      .map((c) => `- ${c.evaluatorName}: "${c.text}"`)
      .join("\n")

    const prompt =
      `Kamu adalah asisten yang merangkum catatan evaluasi kinerja guru dari beberapa penilai menjadi satu catatan ringkas dalam Bahasa Indonesia. ` +
      `Tulis ringkasan dalam 2-3 kalimat, langsung tanpa pengantar, fokus pada poin-poin utama yang disepakati para penilai.\n\n` +
      `Catatan dari ${catatan.length} penilai:\n${catatanText}\n\nRingkasan:`

    const result = await model.generateContent(prompt)
    return result.response.text().trim() || null
  } catch {
    return null
  }
}

export async function GET(_req: Request, ctx: RouteContext<"/api/reports/[teacherId]/pdf">) {
  const { teacherId } = await ctx.params

  const employee = await prisma.employee.findUnique({
    where: { id: teacherId },
    include: {
      evaluations: {
        include: { evaluator: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  })

  if (!employee) {
    return new Response(JSON.stringify({ error: "Employee not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const allEvaluators = await prisma.evaluator.findMany({ orderBy: { name: "asc" } })

  const evaluations = employee.evaluations.map((e) => ({
    evaluator: e.evaluator,
    scores: parseScores(e.scores),
    catatan: e.catatan,
    updatedAt: e.updatedAt,
  }))

  const scoreSets = evaluations.map((e) => e.scores)
  const totals = scoreSets.map((s) => calcTotal(s))
  const avgTotal =
    totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null

  const grade = avgTotal != null ? getScoreGrade(avgTotal) : null

  const roleSections = getSectionsForRole(employee.role ?? "guru")
  const sections = roleSections.map((s) => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    color: s.color,
    maxScore: s.maxScore,
    criteria: s.criteria.map((c) => ({ id: c.id, label: c.label })),
  }))

  const orgSettingsRaw = await prisma.orgSettings.upsert({
    where: { id: "alfakhir" },
    create: { id: "alfakhir" },
    update: {},
  })

  const org = {
    yayasanName: orgSettingsRaw.yayasanName,
    schoolName: orgSettingsRaw.schoolName,
    address: orgSettingsRaw.address,
    phone: orgSettingsRaw.phone,
    city: orgSettingsRaw.city,
    periodLabel: orgSettingsRaw.periodLabel,
    kepalaSekolah: orgSettingsRaw.kepalaSekolah,
    kepalaTitle: orgSettingsRaw.kepalaTitle,
    kepalaSignatureBase64: orgSettingsRaw.kepalaSignatureBase64 ?? null,
    signer2Name: orgSettingsRaw.signer2Name,
    signer2Title: orgSettingsRaw.signer2Title,
    signer2SignatureBase64: orgSettingsRaw.signer2SignatureBase64 ?? null,
    ketuaName: orgSettingsRaw.ketuaName,
    ketuaTitle: orgSettingsRaw.ketuaTitle,
    ketuaSignatureBase64: orgSettingsRaw.ketuaSignatureBase64 ?? null,
    logoBase64: orgSettingsRaw.logoBase64 ?? null,
  }

  // Use saved final catatan if available, otherwise generate via AI
  let catatanSummary: string | null = employee.finalCatatan ?? null
  if (!catatanSummary) {
    const catatanInputs = evaluations
      .filter((e) => e.catatan)
      .map((e) => ({ evaluatorName: e.evaluator.name, text: e.catatan as string }))
    catatanSummary = await summarizeCatatan(catatanInputs)
  }

  const reportData: ReportData = {
    teacher: { name: employee.name, role: employee.role },
    evaluators: allEvaluators,
    evaluations,
    sections,
    avgTotal,
    grade,
    generatedAt: new Date(),
    org,
    catatanSummary,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(ReportDocument, { data: reportData }) as any
  const buffer = await renderToBuffer(element)

  const safeName = employee.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")
  const year = new Date().getFullYear()

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-${safeName}-${year}.pdf"`,
    },
  })
}
