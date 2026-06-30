import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgSettings {
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

export interface ReportData {
  teacher: { name: string; role?: string }
  evaluators: { id: string; name: string }[]
  evaluations: {
    evaluator: { id: string; name: string }
    scores: Record<string, number>
    catatan: string | null
    updatedAt: Date
  }[]
  sections: {
    id: string
    label: string
    icon: string
    color: string
    maxScore: number
    criteria: { id: string; label: string }[]
  }[]
  avgTotal: number | null
  grade: { label: string; color: string; bg: string } | null
  generatedAt: Date
  org: OrgSettings
  catatanSummary?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

function monthYear(d: Date): string {
  return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz"

// ─── Styles ───────────────────────────────────────────────────────────────────

const BLACK  = "#000000"
const DARK   = "#111827"
const GRAY   = "#6B7280"
const SECT   = "#D1D5DB"   // section header bg
const TOTAL  = "#E5E7EB"   // total row bg
const WHITE  = "#FFFFFF"
const BORDER = "#374151"
const LIGHT  = "#F3F4F6"   // alternating row

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

  // ── Outer bordered box ──
  box: {
    borderWidth: 1,
    borderColor: BLACK,
  },

  // ── Header (period + logo) ──
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 58,
  },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // ── Identity rows ──
  idRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    minHeight: 16,
  },
  idLabel: {
    width: 88,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  idColon: { width: 10, fontSize: 8.5 },
  idValue: { flex: 1, fontSize: 8.5, fontFamily: "Helvetica-Bold" },

  // ── Table header ──
  tHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    height: 18,
    alignItems: "center",
    backgroundColor: SECT,
  },

  // ── Section separator row ──
  secRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    height: 15,
    alignItems: "center",
    backgroundColor: SECT,
  },

  // ── Criterion rows ──
  criRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#CBD5E0",
    height: 14,
    alignItems: "center",
  },
  criRowLast: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    height: 14,
    alignItems: "center",
  },

  // ── Total rows ──
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

  // ── Catatan ──
  catatanBox: {
    borderTopWidth: 1,
    borderTopColor: BLACK,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
  },

  // ── Cells ──
  cNo: {
    width: "8%",
    alignSelf: "stretch",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  cAspek: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  cNilai: {
    width: "14%",
    alignSelf: "stretch",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  // Aspek cell that spans into the nilai column (for section header rows)
  cAspekFull: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
})

// ─── Per-teacher page (reused by single and bulk documents) ──────────────────

function TeacherReportPage({ data }: { data: ReportData }) {
  const { teacher, evaluations, sections, avgTotal, generatedAt, org, catatanSummary } = data

  function criterionAvg(id: string): number {
    if (evaluations.length === 0) return 0
    return evaluations.reduce((s, ev) => s + (ev.scores[id] ?? 0), 0) / evaluations.length
  }

  const rawTotal = sections.reduce(
    (s, sec) => s + sec.criteria.reduce((cs, c) => cs + criterionAvg(c.id), 0),
    0,
  )

  const fallback = evaluations.filter((e) => e.catatan).map((e) => e.catatan).join("; ") || "-"
  const catatanText = catatanSummary ?? fallback

  const TH = ({ label, center, bold }: { label: string; center?: boolean; bold?: boolean }) => (
    <Text style={{
      fontSize: 8,
      fontFamily: bold !== false ? "Helvetica-Bold" : "Helvetica",
      textAlign: center ? "center" : "left",
    }}>
      {label}
    </Text>
  )

  return (
      <Page size="A4" style={styles.page}>

        {/* ── Outer box ── */}
        <View style={styles.box}>

          {/* Header */}
          <View style={styles.headerRow}>
            {/* Left: school + appraisal title + period */}
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK }}>
                {org.schoolName || org.yayasanName}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 3 }}>
                {"HASIL PERFORMANCE APPRAISAL  " + (teacher.role === "staff" ? "STAF" : "GURU")}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 3 }}>
                {org.periodLabel}
              </Text>
            </View>

            {/* Right: landscape logo (already contains school name text) */}
            {org.logoBase64 ? (
              <Image
                src={org.logoBase64}
                style={{ width: 130, height: 52, objectFit: "contain" }}
              />
            ) : null}
          </View>

          {/* Identity */}
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Nama Lengkap</Text>
            <Text style={styles.idColon}>:</Text>
            <Text style={styles.idValue}>{teacher.name}</Text>
          </View>
          <View style={[styles.idRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.idLabel}>Jabatan</Text>
            <Text style={styles.idColon}>:</Text>
            <Text style={styles.idValue}>{teacher.role === "staff" ? "Staf" : "Guru"}</Text>
          </View>

          {/* Table header */}
          <View style={styles.tHead}>
            <View style={styles.cNo}><TH label="No." center /></View>
            <View style={styles.cAspek}><TH label="ASPEK PENILAIAN" /></View>
            <View style={styles.cNilai}><TH label="NILAI" center /></View>
          </View>

          {/* Sections + criteria */}
          {sections.map((sec, si) => (
            <View key={sec.id}>
              {/* Section header row */}
              <View style={styles.secRow}>
                <View style={styles.cNo}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>{si + 1}</Text>
                </View>
                <View style={styles.cAspekFull}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center" }}>
                    {sec.label}
                  </Text>
                </View>
              </View>

              {/* Criteria rows */}
              {sec.criteria.map((c, ci) => {
                const avg = criterionAvg(c.id)
                const isLast = ci === sec.criteria.length - 1
                const isAlt = ci % 2 !== 0
                return (
                  <View
                    key={c.id}
                    style={[
                      isLast ? styles.criRowLast : styles.criRow,
                      isAlt ? { backgroundColor: LIGHT } : {},
                    ]}
                  >
                    <View style={styles.cNo}>
                      <Text style={{ fontSize: 7.5, color: GRAY }}>{LETTERS[ci]}</Text>
                    </View>
                    <View style={styles.cAspek}>
                      <Text style={{ fontSize: 7.5 }}>{c.label}</Text>
                    </View>
                    <View style={styles.cNilai}>
                      <Text style={{ fontSize: 7.5 }}>
                        {Number.isInteger(avg) ? avg.toString() : avg.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          ))}

          {/* TOTAL NILAI PA */}
          <View style={styles.totRow}>
            <View style={styles.cNo} />
            <View style={styles.cAspek}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>TOTAL NILAI PA</Text>
            </View>
            <View style={styles.cNilai}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
                {rawTotal % 1 === 0 ? rawTotal.toString() : rawTotal.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* IPK */}
          <View style={styles.totRowLast}>
            <View style={styles.cNo} />
            <View style={styles.cAspek}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>IPK</Text>
            </View>
            <View style={styles.cNilai}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
                {avgTotal != null ? avgTotal.toFixed(2) : "-"}
              </Text>
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

        {/* ── Date ── */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10, marginBottom: 10 }}>
          <Text style={{ fontSize: 8, color: GRAY }}>
            {org.city || "Jakarta"}, {monthYear(generatedAt)}
          </Text>
        </View>

        {/* ── Signatures (3 columns) ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 0 }}>

          {/* Kepala Sekolah */}
          <View style={{ width: "30%", alignItems: "flex-start" }}>
            <Text style={{ fontSize: 8, color: DARK, marginBottom: org.kepalaSignatureBase64 ? 4 : 68 }}>
              {org.kepalaTitle || "Kepala Sekolah"}
            </Text>
            {org.kepalaSignatureBase64 ? (
              <Image
                src={org.kepalaSignatureBase64}
                style={{ width: 80, height: 50, objectFit: "contain", marginBottom: 4 }}
              />
            ) : null}
            <View style={{ borderTopWidth: 1, borderTopColor: DARK, width: "100%", marginBottom: 3 }} />
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
              {org.kepalaSekolah || "_______________"}
            </Text>
          </View>

          {/* Signer 2 */}
          <View style={{ width: "30%", alignItems: "flex-start" }}>
            <Text style={{ fontSize: 8, color: DARK, marginBottom: org.signer2SignatureBase64 ? 4 : 68 }}>
              {org.signer2Title || "_______________"}
            </Text>
            {org.signer2SignatureBase64 ? (
              <Image
                src={org.signer2SignatureBase64}
                style={{ width: 80, height: 50, objectFit: "contain", marginBottom: 4 }}
              />
            ) : null}
            <View style={{ borderTopWidth: 1, borderTopColor: DARK, width: "100%", marginBottom: 3 }} />
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
              {org.signer2Name || "_______________"}
            </Text>
          </View>

          {/* Ketua / Owner */}
          <View style={{ width: "30%", alignItems: "flex-start" }}>
            <Text style={{ fontSize: 8, color: DARK, marginBottom: org.ketuaSignatureBase64 ? 4 : 68 }}>
              {org.ketuaTitle || "Owner & Founder"}
            </Text>
            {org.ketuaSignatureBase64 ? (
              <Image
                src={org.ketuaSignatureBase64}
                style={{ width: 80, height: 50, objectFit: "contain", marginBottom: 4 }}
              />
            ) : null}
            <View style={{ borderTopWidth: 1, borderTopColor: DARK, width: "100%", marginBottom: 3 }} />
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
              {org.ketuaName || "_______________"}
            </Text>
          </View>

        </View>
      </Page>
  )
}

// ─── Single-teacher document ──────────────────────────────────────────────────

export function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Document title={`Laporan Penilaian Kinerja — ${data.teacher.name}`}>
      <TeacherReportPage data={data} />
    </Document>
  )
}

// ─── Bulk document (all teachers, one PDF) ────────────────────────────────────

export function BulkReportDocument({ items, title }: { items: ReportData[]; title?: string }) {
  return (
    <Document title={title ?? "Laporan Penilaian Kinerja Massal"}>
      {items.map((data, i) => (
        <TeacherReportPage key={i} data={data} />
      ))}
    </Document>
  )
}
