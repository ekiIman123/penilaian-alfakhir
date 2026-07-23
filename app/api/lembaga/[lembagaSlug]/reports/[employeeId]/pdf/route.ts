import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "@/lib/prisma"
import { getSectionsForRubric, getNewRubricGrade } from "@/lib/rubrics"
import { parseScores } from "@/lib/calculations"
import {
  LembagaReportDocument,
  type LembagaReportData,
  type LembagaOrgSettings,
} from "@/components/pdf/lembaga-report-document"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const VALID_LEMBAGA = ["iysa", "icgi", "iyora"] as const
type ValidLembaga = (typeof VALID_LEMBAGA)[number]

async function summarizeCatatan(
  entries: { evaluatorName: string; text: string }[],
): Promise<string | null> {
  if (entries.length === 0) return null
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const catatanText = entries.map((c) => `- ${c.evaluatorName}: "${c.text}"`).join("\n")
    const prompt =
      `Kamu adalah asisten yang merangkum catatan evaluasi kinerja karyawan dari beberapa penilai menjadi satu catatan ringkas dalam Bahasa Indonesia. ` +
      `Tulis ringkasan dalam 2-3 kalimat, langsung tanpa pengantar, fokus pada poin-poin utama yang disepakati para penilai.\n\n` +
      `Catatan dari ${entries.length} penilai:\n${catatanText}\n\nRingkasan:`
    const result = await model.generateContent(prompt)
    return result.response.text().trim() || null
  } catch {
    return null
  }
}

function buildOrgFromDb(raw: {
  yayasanName: string; schoolName: string; address: string; phone: string; city: string;
  periodLabel: string; kepalaSekolah: string; kepalaTitle: string;
  kepalaSignatureBase64: string | null; signer2Name: string; signer2Title: string;
  signer2SignatureBase64: string | null; ketuaName: string; ketuaTitle: string;
  ketuaSignatureBase64: string | null; logoBase64: string | null;
}): LembagaOrgSettings {
  return {
    yayasanName:            raw.yayasanName,
    schoolName:             raw.schoolName,
    address:                raw.address,
    phone:                  raw.phone,
    city:                   raw.city,
    periodLabel:            raw.periodLabel,
    kepalaSekolah:          raw.kepalaSekolah,
    kepalaTitle:            raw.kepalaTitle,
    kepalaSignatureBase64:  raw.kepalaSignatureBase64,
    signer2Name:            raw.signer2Name,
    signer2Title:           raw.signer2Title,
    signer2SignatureBase64: raw.signer2SignatureBase64,
    ketuaName:              raw.ketuaName,
    ketuaTitle:             raw.ketuaTitle,
    ketuaSignatureBase64:   raw.ketuaSignatureBase64,
    logoBase64:             raw.logoBase64,
  }
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/reports/[employeeId]/pdf">,
) {
  const { lembagaSlug, employeeId } = await ctx.params

  if (!VALID_LEMBAGA.includes(lembagaSlug as ValidLembaga)) {
    return new Response(JSON.stringify({ error: "Invalid lembaga" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const [employee, orgRaw] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: employeeId, lembaga: lembagaSlug },
      include: {
        evaluations: {
          include: { evaluator: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.orgSettings.upsert({
      where: { id: lembagaSlug },
      create: { id: lembagaSlug },
      update: {},
    }),
  ])

  if (!employee) {
    return new Response(JSON.stringify({ error: "Employee not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const rubricType = employee.role === "staff" ? "ae" : "ag"
  const sections   = getSectionsForRubric(rubricType)
  const maxScore   = rubricType === "ae" ? 60 : 84

  const evaluations = employee.evaluations.map((e) => ({
    evaluator: { id: e.evaluator.id, name: e.evaluator.name },
    scores:    parseScores(e.scores),
    catatan:   e.catatan,
    updatedAt: e.updatedAt,
  }))

  // Compute raw total for grade (avg criterion scores summed)
  function criterionAvg(id: string): number {
    const vals = evaluations.map((e) => e.scores[id] ?? 0).filter((v) => v > 0)
    if (vals.length === 0) return 0
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }
  const rawTotal = sections.reduce(
    (s, sec) => s + sec.criteria.reduce((cs, c) => cs + criterionAvg(c.id), 0),
    0,
  )
  const grade = rawTotal > 0 ? getNewRubricGrade(rawTotal, rubricType) : null

  const org = buildOrgFromDb(orgRaw)

  // Build catatan summary
  let catatanSummary: string | null = employee.finalCatatan ?? null
  if (!catatanSummary) {
    const catatanInputs = evaluations
      .filter((e) => e.catatan)
      .map((e) => {
        // Parse per-section JSON catatan into flat text
        try {
          const parsed = JSON.parse(e.catatan as string)
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const text = sections
              .map((s) => (parsed[s.id] as string)?.trim())
              .filter(Boolean)
              .join("; ")
            return text ? { evaluatorName: e.evaluator.name, text } : null
          }
        } catch {}
        return e.catatan ? { evaluatorName: e.evaluator.name, text: e.catatan } : null
      })
      .filter((x): x is { evaluatorName: string; text: string } => x !== null)

    catatanSummary = await summarizeCatatan(catatanInputs)
  }

  const divisiDisplay = employee.divisi
    ? (() => {
        try {
          const p = JSON.parse(employee.divisi)
          return Array.isArray(p) ? p.join(", ") : employee.divisi
        } catch {
          return employee.divisi
        }
      })()
    : null

  const reportData: LembagaReportData = {
    employee:      { name: employee.name, role: employee.role, divisi: divisiDisplay },
    rubricType,
    evaluations,
    sections,
    maxScore,
    generatedAt:   new Date(),
    org,
    catatanSummary,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(LembagaReportDocument, { data: reportData }) as any
  const buffer  = await renderToBuffer(element)

  const safeName = employee.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")
  const year     = new Date().getFullYear()

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rapor-${safeName}-${year}.pdf"`,
    },
  })
}
