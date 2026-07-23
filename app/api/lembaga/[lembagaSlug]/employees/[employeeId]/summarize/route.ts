import { prisma } from "@/lib/prisma"
import Groq from "groq-sdk"
import { getSectionsForRubric } from "@/lib/rubrics"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/lembaga/[lembagaSlug]/employees/[employeeId]/summarize">,
) {
  const { lembagaSlug, employeeId } = await ctx.params

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, lembaga: lembagaSlug },
    include: { evaluations: { include: { evaluator: true } } },
  })

  if (!employee) return new Response("Not found", { status: 404 })

  const rubricType = employee.role === "staff" ? "ae" : "ag"
  const sections = getSectionsForRubric(rubricType)

  const catatanEntries = employee.evaluations
    .filter((e) => e.catatan)
    .map((e) => {
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
      return e.catatan ? { evaluatorName: e.evaluator.name, text: e.catatan as string } : null
    })
    .filter((x): x is { evaluatorName: string; text: string } => x !== null)

  if (catatanEntries.length === 0) return Response.json({ summary: null })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return Response.json({ summary: null })

  try {
    const client = new Groq({ apiKey })
    const catatanText = catatanEntries
      .map((c) => `Penilai: ${c.evaluatorName}\nCatatan: ${c.text}`)
      .join("\n\n")

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah asisten HR yang menulis catatan evaluasi kinerja profesional dalam Bahasa Indonesia. " +
            "Tulis ringkasan yang formal, konstruktif, dan langsung ke inti. " +
            "Jangan sebut nama penilai. Jangan gunakan kalimat pembuka seperti 'Berdasarkan catatan...'.",
        },
        {
          role: "user",
          content:
            `Berikut catatan dari ${catatanEntries.length} penilai untuk karyawan bernama ${employee.name}:\n\n` +
            `${catatanText}\n\n` +
            `Tulis SATU paragraf ringkasan (2-3 kalimat) yang mencerminkan poin-poin utama dari para penilai. Tulis hanya paragrafnya saja:`,
        },
      ],
    })

    const summary = completion.choices[0]?.message?.content?.trim() ?? null
    return Response.json({ summary })
  } catch (err) {
    console.error("[summarize] Groq error:", err)
    return Response.json({ summary: null })
  }
}
