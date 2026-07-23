import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import JSZip from "jszip"
import { prisma } from "@/lib/prisma"
import { getSectionsForRubric } from "@/lib/rubrics"
import { parseScores } from "@/lib/calculations"
import {
  LembagaBulkReportDocument,
  LembagaReportDocument,
  type LembagaReportData,
  type LembagaOrgSettings,
} from "@/components/pdf/lembaga-report-document"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const VALID_LEMBAGA = ["iysa", "icgi", "iyora"] as const
type ValidLembaga = (typeof VALID_LEMBAGA)[number]

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

function parseCatatanToText(catatan: string | null, sections: ReturnType<typeof getSectionsForRubric>): string | null {
  if (!catatan) return null
  try {
    const parsed = JSON.parse(catatan)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const parts = sections.map((s) => (parsed[s.id] as string)?.trim()).filter(Boolean)
      return parts.length > 0 ? parts.join("; ") : null
    }
  } catch {}
  return catatan
}

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/reports/bulk">,
) {
  const { lembagaSlug } = await ctx.params

  if (!VALID_LEMBAGA.includes(lembagaSlug as ValidLembaga)) {
    return new Response(JSON.stringify({ error: "Invalid lembaga" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") ?? "pdf"   // "pdf" | "zip"
  const role   = searchParams.get("role")   ?? "all"   // "all" | "staff" | "non-staff"

  const roleFilter =
    role === "staff"     ? { role: "staff" } :
    role === "non-staff" ? { role: { not: "staff" } } :
    {}

  const [employees, orgRaw] = await Promise.all([
    prisma.employee.findMany({
      where: { lembaga: lembagaSlug, ...roleFilter },
      include: {
        evaluations: {
          include: { evaluator: true },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.orgSettings.upsert({
      where: { id: lembagaSlug },
      create: { id: lembagaSlug },
      update: {},
    }),
  ])

  const org = buildOrgFromDb(orgRaw)

  const items: LembagaReportData[] = employees.map((emp) => {
    const rubricType = emp.role === "staff" ? "ae" : "ag"
    const sections   = getSectionsForRubric(rubricType)
    const maxScore   = rubricType === "ae" ? 60 : 84

    const evaluations = emp.evaluations.map((e) => ({
      evaluator: { id: e.evaluator.id, name: e.evaluator.name },
      scores:    parseScores(e.scores),
      catatan:   e.catatan,
      updatedAt: e.updatedAt,
    }))

    // Fallback catatan: join per-section texts from all evaluators
    const catatanSummary = emp.finalCatatan ?? (() => {
      const parts = evaluations
        .map((e) => {
          const text = parseCatatanToText(e.catatan, sections)
          return text ? `${e.evaluator.name}: ${text}` : null
        })
        .filter((x): x is string => x !== null)
      return parts.length > 0 ? parts.join(" | ") : null
    })()

    const divisiDisplay = emp.divisi
      ? (() => {
          try {
            const p = JSON.parse(emp.divisi)
            return Array.isArray(p) ? p.join(", ") : emp.divisi
          } catch {
            return emp.divisi
          }
        })()
      : null

    return {
      employee:    { name: emp.name, role: emp.role, divisi: divisiDisplay },
      rubricType,
      evaluations,
      sections,
      maxScore,
      generatedAt: new Date(),
      org,
      catatanSummary,
    }
  })

  const year      = new Date().getFullYear()
  const roleLabel =
    role === "staff"     ? "staf" :
    role === "non-staff" ? "non-staf" :
    "semua"
  const slug = lembagaSlug.toUpperCase()

  // ── Single merged PDF ────────────────────────────────────────────────────────
  if (format === "pdf") {
    const title   = `Laporan Penilaian Kinerja ${slug} — ${roleLabel === "semua" ? "Semua" : roleLabel === "staf" ? "Staf" : "Non Staf"} — ${orgRaw.periodLabel}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = createElement(LembagaBulkReportDocument, { items, title }) as any
    const buffer  = await renderToBuffer(element)
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapor-${lembagaSlug}-${roleLabel}-${year}.pdf"`,
      },
    })
  }

  // ── ZIP with individual PDFs ─────────────────────────────────────────────────
  const zip = new JSZip()
  for (const data of items) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const element  = createElement(LembagaReportDocument, { data }) as any
      const buffer   = await renderToBuffer(element)
      const safeName = data.employee.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")
      const roleTag  = data.employee.role === "staff" ? "staf" : "non-staf"
      zip.file(`${lembagaSlug}-${roleTag}-${safeName}-${year}.pdf`, Buffer.from(buffer))
    } catch (err) {
      console.error(`ZIP: PDF failed for ${data.employee.name}:`, err)
    }
  }
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })
  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="rapor-${lembagaSlug}-${roleLabel}-${year}.zip"`,
    },
  })
}
