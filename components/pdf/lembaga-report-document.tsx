import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import type { Section } from "@/lib/rubrics"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LembagaOrgSettings {
  yayasanName: string
  schoolName: string
  address: string
  phone: string
  city: string
  periodLabel: string
  kepalaSekolah: string
  kepalaTitle: string
  kepalaSignatureBase64: string | null
  signer2Name: string
  signer2Title: string
  signer2SignatureBase64: string | null
  ketuaName: string
  ketuaTitle: string
  ketuaSignatureBase64: string | null
  logoBase64: string | null
}

export interface LembagaReportData {
  employee: {
    name: string
    role: string
    divisi: string | null
  }
  rubricType: "ae" | "ag"
  evaluations: {
    evaluator: { id: string; name: string }
    scores: Record<string, number>
    catatan: string | null
    updatedAt: Date
  }[]
  sections: Section[]
  maxScore: number
  generatedAt: Date
  org: LembagaOrgSettings
  catatanSummary: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
]

function fullDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

const ROLE_LABEL: Record<string, string> = {
  staff:       "Staf",
  koordinator: "Koordinator",
  supervisor:  "Supervisor",
  ceo:         "CEO",
  pm:          "Project Manager",
  management:  "Management",
  founder:     "General Manager",
  superadmin:  "Super Admin",
}

function parseSectionCatatan(catatan: string | null): Record<string, string> {
  if (!catatan) return {}
  try {
    const p = JSON.parse(catatan)
    if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, string>
  } catch {}
  return {}
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BLACK  = "#000000"
const DARK   = "#111827"
const GRAY   = "#6B7280"
const SECT   = "#D1D5DB"
const TOTAL  = "#E5E7EB"
const WHITE  = "#FFFFFF"
const BORDER = "#374151"
const LIGHT  = "#F3F4F6"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 22,
    paddingBottom: 28,
    paddingHorizontal: 30,
    fontSize: 8.5,
    color: DARK,
  },
  box: {
    borderWidth: 1,
    borderColor: BLACK,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 58,
  },
  idRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    minHeight: 16,
  },
  idLabel: { width: 88, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  idColon: { width: 10, fontSize: 8.5 },
  idValue: { flex: 1, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  tHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    height: 18,
    alignItems: "center",
    backgroundColor: SECT,
  },
  secRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    height: 15,
    alignItems: "center",
    backgroundColor: SECT,
  },
  criRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#CBD5E0",
    height: 14,
    alignItems: "center",
  },
  criRowLast: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: BLACK,
    height: 14,
    alignItems: "center",
  },
  subtotalRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    height: 15,
    alignItems: "center",
    backgroundColor: "#EFEFEF",
  },
  totRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
    height: 16,
    alignItems: "center",
    backgroundColor: TOTAL,
  },
  totRowLast: {
    flexDirection: "row",
    height: 16,
    alignItems: "center",
    backgroundColor: TOTAL,
  },
  catatanBox: {
    borderTopWidth: 1,
    borderTopColor: BLACK,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
  },
  // Columns
  cNo:    { width: "7%",  alignSelf: "stretch", justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: BORDER },
  cAspek: { flex: 1,      alignSelf: "stretch", justifyContent: "center", paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: BORDER },
  cNilai: { width: "13%", alignSelf: "stretch", justifyContent: "center", alignItems: "center", paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: BORDER },
  cMax:   { width: "13%", alignSelf: "stretch", justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  cAspekFull: { flex: 1,  alignSelf: "stretch", justifyContent: "center", paddingHorizontal: 8 },
})

// ─── Per-employee report page ──────────────────────────────────────────────────

function LembagaReportPage({ data }: { data: LembagaReportData }) {
  const { employee, rubricType, evaluations, sections, maxScore, generatedAt, org, catatanSummary } = data

  // Rata-rata skor dari semua penilai per kriteria (standar industri)
  const evCount = Math.max(evaluations.length, 1)

  function criterionAvg(id: string): number {
    const sum = evaluations.reduce((s, e) => s + (e.scores[id] ?? 0), 0)
    return sum / evCount
  }

  function sectionTotal(sec: Section): number {
    return sec.criteria.reduce((s, c) => s + criterionAvg(c.id), 0)
  }

  const rawTotal = sections.reduce((s, sec) => s + sectionTotal(sec), 0)
  const pct      = maxScore > 0 ? (rawTotal / maxScore) * 100 : 0
  const nilai4   = maxScore > 0 ? (rawTotal * 4) / maxScore : 0

  // Catatan: use summary or fallback from all evaluators
  const catatanText = catatanSummary ?? (() => {
    const parts: string[] = []
    for (const ev of evaluations) {
      const parsed = parseSectionCatatan(ev.catatan)
      const sectionTexts = sections
        .map((s) => parsed[s.id]?.trim())
        .filter(Boolean)
        .join("; ")
      if (sectionTexts) parts.push(`${ev.evaluator.name}: ${sectionTexts}`)
    }
    return parts.length > 0 ? parts.join(" | ") : "-"
  })()

  const roleDisplay = ROLE_LABEL[employee.role] ?? employee.role

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.box}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK }}>
              {org.yayasanName || org.schoolName || "IYSA"}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 3 }}>
              {"HASIL PERFORMANCE APPRAISAL"}
            </Text>
          </View>
          {org.logoBase64 ? (
            <Image src={org.logoBase64} style={{ width: 130, height: 52, objectFit: "contain" }} />
          ) : null}
        </View>

        {/* Identity */}
        <View style={styles.idRow}>
          <Text style={styles.idLabel}>Nama Lengkap</Text>
          <Text style={styles.idColon}>:</Text>
          <Text style={styles.idValue}>{employee.name}</Text>
        </View>
        <View style={[styles.idRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.idLabel}>Jabatan</Text>
          <Text style={styles.idColon}>:</Text>
          <Text style={styles.idValue}>
            {employee.divisi ? `${roleDisplay} ${employee.divisi}` : roleDisplay}
          </Text>
        </View>

        {/* Table header */}
        <View style={styles.tHead}>
          <View style={styles.cNo}><Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>No.</Text></View>
          <View style={styles.cAspek}><Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>ASPEK PENILAIAN</Text></View>
          <View style={styles.cNilai}><Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center" }}>NILAI</Text></View>
          <View style={styles.cMax}><Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center" }}>MAKS</Text></View>
        </View>

        {/* Sections + criteria */}
        {sections.map((sec, si) => {
          const secTot = sectionTotal(sec)
          const letter = String.fromCharCode(65 + si)   // A, B, C …
          return (
            <View key={sec.id}>
              {/* Section header */}
              <View style={styles.secRow}>
                <View style={styles.cNo} />
                <View style={styles.cAspekFull}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>{sec.label}</Text>
                </View>
              </View>

              {/* Criteria */}
              {sec.criteria.map((c, ci) => {
                const avg    = criterionAvg(c.id)
                const isLast = ci === sec.criteria.length - 1
                const isAlt  = ci % 2 !== 0
                const label  = String.fromCharCode(97 + ci)  // a, b, c …
                return (
                  <View
                    key={c.id}
                    style={[
                      isLast ? styles.criRowLast : styles.criRow,
                      isAlt ? { backgroundColor: LIGHT } : {},
                    ]}
                  >
                    <View style={styles.cNo}>
                      <Text style={{ fontSize: 7.5, color: GRAY }}>{label}</Text>
                    </View>
                    <View style={styles.cAspek}>
                      <Text style={{ fontSize: 7.5 }}>{c.label}</Text>
                    </View>
                    <View style={styles.cNilai}>
                      <Text style={{ fontSize: 7.5 }}>
                        {avg > 0 ? (Number.isInteger(avg) ? avg.toString() : avg.toFixed(2)) : "—"}
                      </Text>
                    </View>
                    <View style={styles.cMax}>
                      <Text style={{ fontSize: 7.5, color: GRAY }}>4</Text>
                    </View>
                  </View>
                )
              })}

            </View>
          )
        })}

        {/* Grand totals */}
        <View style={styles.totRow}>
          <View style={styles.cNo} />
          <View style={styles.cAspek}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>TOTAL SKOR PA</Text>
          </View>
          <View style={styles.cNilai}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
              {rawTotal > 0 ? (Number.isInteger(rawTotal) ? rawTotal.toString() : rawTotal.toFixed(1)) : "—"}
            </Text>
          </View>
          <View style={styles.cMax}>
            <Text style={{ fontSize: 8, color: GRAY }}>{maxScore}</Text>
          </View>
        </View>

        <View style={styles.totRowLast}>
          <View style={styles.cNo} />
          <View style={styles.cAspek}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>IPK</Text>
          </View>
          <View style={styles.cNilai}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
              {rawTotal > 0 ? nilai4.toFixed(2) : "—"}
            </Text>
          </View>
          <View style={styles.cMax}>
            <Text style={{ fontSize: 8, color: GRAY }}>4.00</Text>
          </View>
        </View>

        {/* Catatan */}
        <View style={styles.catatanBox}>
          <Text style={{ fontSize: 8 }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Catatan</Text>
            {"  :  "}
            <Text style={{ fontFamily: "Helvetica-Oblique", color: GRAY }}>{catatanText}</Text>
          </Text>
        </View>
      </View>

      {/* Date */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10, marginBottom: 10 }}>
        <Text style={{ fontSize: 8, color: GRAY }}>
          {org.city || "Jakarta"}, {fullDate(generatedAt)}
        </Text>
      </View>

      {/* Signatures */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 0 }}>
        {[
          { title: org.kepalaTitle  || "Pimpinan",            name: org.kepalaSekolah   || "_______________", sig: org.kepalaSignatureBase64  },
          { title: org.signer2Title || "_______________",      name: org.signer2Name     || "_______________", sig: org.signer2SignatureBase64 },
          { title: org.ketuaTitle   || "Owner & Founder",     name: org.ketuaName       || "_______________", sig: org.ketuaSignatureBase64   },
        ].map((s, i) => (
          <View key={i} style={{ width: "30%", alignItems: "flex-start" }}>
            <Text style={{ fontSize: 8, color: DARK, marginBottom: 4 }}>{s.title}</Text>
            {s.sig ? (
              <Image src={s.sig} style={{ width: "100%", height: 60, objectFit: "contain", marginBottom: 4 }} />
            ) : (
              <View style={{ height: 60, marginBottom: 4 }} />
            )}
            <View style={{ borderTopWidth: 1, borderTopColor: DARK, width: "100%", marginBottom: 3 }} />
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>{s.name}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function LembagaReportDocument({ data }: { data: LembagaReportData }) {
  return (
    <Document title={`Laporan Penilaian Kinerja — ${data.employee.name}`}>
      <LembagaReportPage data={data} />
    </Document>
  )
}

export function LembagaBulkReportDocument({ items, title }: { items: LembagaReportData[]; title?: string }) {
  return (
    <Document title={title ?? "Laporan Penilaian Kinerja Massal"}>
      {items.map((data, i) => (
        <LembagaReportPage key={i} data={data} />
      ))}
    </Document>
  )
}
