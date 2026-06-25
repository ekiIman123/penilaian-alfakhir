import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import JSZip from "jszip"
import { prisma } from "@/lib/prisma"
import { getSectionsForRole, getScoreGrade } from "@/lib/rubrics"
import { parseScores, calcTotal } from "@/lib/calculations"
import { BulkReportDocument, ReportDocument, type ReportData } from "@/components/pdf/report-document"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const role   = searchParams.get("role")   ?? "all"  // "all" | "guru" | "staff"
  const format = searchParams.get("format") ?? "pdf"  // "pdf" | "zip"

  const roleFilter =
    role === "all"   ? {} :
    role === "staff" ? { role: "staff" } :
                       { role: { not: "staff" } }

  const [teachers, allEvaluators, orgSettingsRaw] = await Promise.all([
    prisma.teacher.findMany({
      where: roleFilter,
      include: {
        evaluations: {
          include: { evaluator: true },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.evaluator.findMany({ orderBy: { name: "asc" } }),
    prisma.orgSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
  ])

  const org = {
    yayasanName:   orgSettingsRaw.yayasanName,
    schoolName:    orgSettingsRaw.schoolName,
    address:       orgSettingsRaw.address,
    phone:         orgSettingsRaw.phone,
    city:          orgSettingsRaw.city,
    periodLabel:   orgSettingsRaw.periodLabel,
    kepalaSekolah: orgSettingsRaw.kepalaSekolah,
    kepalaTitle:   orgSettingsRaw.kepalaTitle,
    signer2Name:   orgSettingsRaw.signer2Name,
    signer2Title:  orgSettingsRaw.signer2Title,
    ketuaName:     orgSettingsRaw.ketuaName,
    ketuaTitle:    orgSettingsRaw.ketuaTitle,
    logoBase64:    orgSettingsRaw.logoBase64 ?? null,
  }

  const items: ReportData[] = teachers.map((teacher) => {
    const evaluations = teacher.evaluations.map((e) => ({
      evaluator: e.evaluator,
      scores:    parseScores(e.scores),
      catatan:   e.catatan,
      updatedAt: e.updatedAt,
    }))
    const totals   = evaluations.map((e) => calcTotal(e.scores))
    const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null
    const grade    = avgTotal != null ? getScoreGrade(avgTotal) : null
    const roleSections = getSectionsForRole(teacher.role ?? "guru")
    const sections = roleSections.map((s) => ({
      id: s.id, label: s.label, icon: s.icon, color: s.color, maxScore: s.maxScore,
      criteria: s.criteria.map((c) => ({ id: c.id, label: c.label })),
    }))
    const catatanParts = evaluations.filter((e) => e.catatan).map((e) => e.catatan as string)
    const catatanSummary = teacher.finalCatatan
      ?? (catatanParts.length > 0 ? catatanParts.join(" | ") : null)
    return {
      teacher: { name: teacher.name, role: teacher.role },
      evaluators: allEvaluators,
      evaluations,
      sections,
      avgTotal,
      grade,
      generatedAt: new Date(),
      org,
      catatanSummary,
    }
  })

  const year      = new Date().getFullYear()
  const roleLabel = role === "all" ? "semua" : role === "staff" ? "staf" : "guru"

  // ── Single merged PDF ──────────────────────────────────────────────────────
  if (format === "pdf") {
    const label   = role === "all" ? "Semua" : role === "staff" ? "Staf" : "Guru"
    const title   = `Laporan Penilaian Kinerja ${label} — ${orgSettingsRaw.periodLabel}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = createElement(BulkReportDocument, { items, title }) as any
    const buffer  = await renderToBuffer(element)
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapor-massal-${roleLabel}-${year}.pdf"`,
      },
    })
  }

  // ── ZIP with individual PDFs ───────────────────────────────────────────────
  const zip = new JSZip()
  for (const data of items) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const element = createElement(ReportDocument, { data }) as any
      const buffer  = await renderToBuffer(element)
      const safeName = data.teacher.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")
      const roleTag  = data.teacher.role === "staff" ? "staf" : "guru"
      zip.file(`${roleTag}-${safeName}-${year}.pdf`, Buffer.from(buffer))
    } catch (err) {
      console.error(`ZIP: PDF failed for ${data.teacher.name}:`, err)
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
      "Content-Disposition": `attachment; filename="rapor-${roleLabel}-${year}.zip"`,
    },
  })
}
