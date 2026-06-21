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
  ketuaName: string
  ketuaTitle: string
  logoBase64: string | null
}

export interface ReportData {
  teacher: { name: string }
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

function formatDateId(d: Date): string {
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

function shortName(name: string): string {
  const base = name.split(",")[0]
  return base.split(" ")[0]
}

function gradeBg(label: string | undefined): string {
  if (!label) return "#F3F4F6"
  if (label === "Sangat Baik") return "#DCFCE7"
  if (label === "Baik") return "#DBEAFE"
  if (label === "Cukup") return "#FEF3C7"
  if (label === "Kurang") return "#FFEDD5"
  return "#FEE2E2"
}

// Compute responsive column widths based on evaluator count
// so that all columns always sum to exactly 100%
function getColWidths(evCount: number) {
  const avgW = 12
  const maxW = 8
  // Narrow evaluator columns when there are more evaluators
  const evW = evCount >= 4 ? 11 : evCount === 3 ? 13 : evCount === 2 ? 16 : 20
  return {
    // Page 1 summary table: Aspek | ev…  | Rata-rata | Maks
    s_aspek: `${100 - evCount * evW - avgW - maxW}%`,
    s_ev:    `${evW}%`,
    s_avg:   `${avgW}%`,
    s_max:   `${maxW}%`,
    // Page 2 detail table: Kriteria | ev… | Rata-rata
    d_crit:  `${100 - evCount * evW - avgW}%`,
    d_ev:    `${evW}%`,
    d_avg:   `${avgW}%`,
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PRIMARY = "#3B2008"
const ACCENT = "#C4972A"
const LIGHT_BG = "#FEF3C7"
const HEADER_BG = "#2C1A08"
const WHITE = "#FFFFFF"
const GRAY_TEXT = "#7A6652"
const GRAY_LIGHT = "#F7F2EC"
const BORDER_COLOR = "#E7DDD0"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontSize: 9,
    color: PRIMARY,
  },

  kop: {
    marginHorizontal: -30,
    marginTop: -24,
    paddingHorizontal: 30,
    paddingVertical: 10,
    backgroundColor: PRIMARY,
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 0,
  },
  kopSchool: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textAlign: "center",
    letterSpacing: 1,
  },
  kopAddress: {
    fontSize: 8,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 2,
  },
  kopSub: {
    fontSize: 10,
    color: WHITE,
    textAlign: "center",
    marginTop: 2,
  },

  rule: {
    height: 2,
    backgroundColor: ACCENT,
    marginHorizontal: -30,
    marginBottom: 8,
  },
  ruleThin: {
    height: 1,
    backgroundColor: ACCENT,
    marginHorizontal: -30,
    marginBottom: 8,
    marginTop: 8,
  },

  titleBlock: {
    alignItems: "center",
    paddingVertical: 10,
  },
  titleMain: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  titleSub: {
    fontSize: 10,
    color: GRAY_TEXT,
    textAlign: "center",
    marginTop: 3,
  },

  identityBlock: {
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 4,
    overflow: "hidden",
  },
  identityRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    minHeight: 20,
  },
  identityRowLast: {
    flexDirection: "row",
    minHeight: 20,
  },
  identityLabel: {
    width: "35%",
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: GRAY_TEXT,
    backgroundColor: GRAY_LIGHT,
  },
  identityValue: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 8,
    color: PRIMARY,
    fontFamily: "Helvetica-Bold",
  },

  sectionHeading: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  table: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },

  // Fixed row heights to prevent expansion on page break
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: HEADER_BG,
    height: 20,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    height: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  tableRowAlt: {
    flexDirection: "row",
    height: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    backgroundColor: GRAY_LIGHT,
  },

  tableCellHeader: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    textAlign: "center",
    paddingHorizontal: 3,
  },
  tableCell: {
    fontSize: 7,
    color: PRIMARY,
    paddingHorizontal: 5,
  },
  tableCellCenter: {
    fontSize: 7,
    color: PRIMARY,
    paddingHorizontal: 3,
    textAlign: "center",
  },
  tableCellAccent: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    paddingHorizontal: 3,
    textAlign: "center",
  },
  tableCellBold: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    paddingHorizontal: 5,
  },

  totalRow: {
    flexDirection: "row",
    height: 18,
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: ACCENT,
    backgroundColor: LIGHT_BG,
  },

  // Compact versions for page 2 detail tables
  tableHeaderRowSm: {
    flexDirection: "row",
    backgroundColor: HEADER_BG,
    height: 18,
    alignItems: "center",
  },
  tableRowSm: {
    flexDirection: "row",
    height: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  tableRowAltSm: {
    flexDirection: "row",
    height: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    backgroundColor: GRAY_LIGHT,
  },
  totalRowSm: {
    flexDirection: "row",
    height: 16,
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: ACCENT,
    backgroundColor: LIGHT_BG,
  },
  detailSectionHeaderSm: {
    flexDirection: "row",
    height: 16,
    alignItems: "center",
    paddingHorizontal: 6,
  },

  gradeBox: {
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: ACCENT,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  gradeLabel: {
    fontSize: 11,
    color: GRAY_TEXT,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  gradeScore: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    lineHeight: 1.1,
  },
  gradeBadge: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  gradeBadgeText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },

  notesBlock: {
    marginBottom: 12,
  },
  noteItem: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
  },
  noteEvaluatorName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginBottom: 2,
  },
  noteText: {
    fontSize: 8,
    color: GRAY_TEXT,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.4,
  },

  footer: {
    position: "absolute",
    bottom: 14,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: ACCENT,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: GRAY_TEXT,
  },
  footerPage: {
    fontSize: 7,
    color: GRAY_TEXT,
    fontFamily: "Helvetica-Bold",
  },

  // Fixed height on section color header — prevents expansion near page breaks
  detailSectionHeader: {
    flexDirection: "row",
    height: 18,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  detailSectionHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  signatureBlock: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-between",
  },
  signatureCol: {
    width: "30%",
    alignItems: "center",
  },
  signatureLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
    textAlign: "center",
    marginBottom: 4,
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    textAlign: "center",
  },
})

// ─── Sub-components ───────────────────────────────────────────────────────────

function KopSurat({ org }: { org: OrgSettings }) {
  const logoSize = 52

  return (
    <View style={styles.kop}>
      {/*
        width:"100%" is critical — without it, alignItems:"center" on the parent
        shrinks this row to its minimum content width, causing text to wrap per-character.
      */}
      <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>

        {/* Left slot — logo if available, otherwise equal-width blank */}
        <View style={{ width: logoSize, alignItems: "center", justifyContent: "center" }}>
          {org.logoBase64 ? (
            <Image src={org.logoBase64} style={{ width: logoSize, height: logoSize, objectFit: "contain" }} />
          ) : null}
        </View>

        {/* Centre — all text, always centred */}
        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
          <Text style={styles.kopSchool}>{org.yayasanName}</Text>
          <Text style={styles.kopSub}>{org.schoolName}</Text>
          <Text style={styles.kopAddress}>{org.address}</Text>
          {org.phone ? (
            <Text style={styles.kopAddress}>{org.phone}</Text>
          ) : null}
        </View>

        {/* Right mirror spacer — keeps text visually centred */}
        <View style={{ width: logoSize }} />
      </View>
    </View>
  )
}

function PageFooter({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Dokumen ini digenerate secara otomatis oleh Sistem Penilaian Kinerja Guru SMP Al Fakhir
      </Text>
      <Text style={styles.footerPage}>Halaman {current} dari {total}</Text>
    </View>
  )
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function ReportDocument({ data }: { data: ReportData }) {
  const { teacher, evaluators, evaluations, sections, avgTotal, grade, generatedAt, org } = data

  const evCount = evaluations.length
  const W = getColWidths(evCount)

  function sectionRaw(ev: (typeof evaluations)[0], secId: string): number {
    const sec = sections.find((s) => s.id === secId)
    if (!sec) return 0
    return sec.criteria.reduce((sum, c) => sum + (ev.scores[c.id] ?? 0), 0)
  }

  function evalTotal(ev: (typeof evaluations)[0]): number {
    return sections.reduce((sum, sec) => sum + sectionRaw(ev, sec.id), 0)
  }

  function sectionAvgRaw(secId: string): number | null {
    if (evaluations.length === 0) return null
    const vals = evaluations.map((ev) => sectionRaw(ev, secId))
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  // Average of raw totals (25–100 scale) for the summary TOTAL row
  const evalTotals = evaluations.map(evalTotal)
  const avgRawTotal =
    evalTotals.length > 0 ? evalTotals.reduce((a, b) => a + b, 0) / evalTotals.length : null

  // avgTotal from API is in 1–4 scale (calcTotal = sum/25)
  const displayAvg = avgTotal // 1–4 scale

  function perEvGrade(rawTotal: number): string {
    // Thresholds: 3.4×25=85, 2.8×25=70, 2.2×25=55, 1.6×25=40
    if (rawTotal >= 85) return "SB"
    if (rawTotal >= 70) return "B"
    if (rawTotal >= 55) return "C"
    if (rawTotal >= 40) return "K"
    return "SK"
  }

  return (
    <Document
      title={`Laporan Penilaian Kinerja - ${teacher.name}`}
      author="Sistem Penilaian Kinerja Guru SMP Al Fakhir"
    >
      {/* ══ PAGE 1 ══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <KopSurat org={org} />
        <View style={styles.rule} />

        <View style={styles.titleBlock}>
          <Text style={styles.titleMain}>LAPORAN PENILAIAN KINERJA GURU</Text>
          <Text style={styles.titleSub}>{org.periodLabel}</Text>
        </View>
        <View style={styles.ruleThin} />

        {/* Identity block */}
        <View style={styles.identityBlock}>
          <View style={styles.identityRow}>
            <Text style={styles.identityLabel}>Nama Guru</Text>
            <Text style={styles.identityValue}>{teacher.name}</Text>
          </View>
          <View style={styles.identityRow}>
            <Text style={styles.identityLabel}>Periode Penilaian</Text>
            <Text style={styles.identityValue}>{org.periodLabel}</Text>
          </View>
          <View style={styles.identityRow}>
            <Text style={styles.identityLabel}>Tanggal Laporan</Text>
            <Text style={styles.identityValue}>{formatDateId(generatedAt)}</Text>
          </View>
          <View style={styles.identityRowLast}>
            <Text style={styles.identityLabel}>Jumlah Penilai</Text>
            <Text style={styles.identityValue}>
              {evaluations.length} dari {evaluators.length} penilai
            </Text>
          </View>
        </View>

        {/* Summary table */}
        <Text style={styles.sectionHeading}>Rekapitulasi Nilai per Aspek</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCellHeader, { width: W.s_aspek, textAlign: "left" }]}>Aspek</Text>
            {evaluations.map((ev) => (
              <Text key={ev.evaluator.id} style={[styles.tableCellHeader, { width: W.s_ev }]}>
                {shortName(ev.evaluator.name)}
              </Text>
            ))}
            <Text style={[styles.tableCellHeader, { width: W.s_avg, color: ACCENT }]}>Rata-rata</Text>
            <Text style={[styles.tableCellHeader, { width: W.s_max }]}>Maks</Text>
          </View>

          {sections.map((sec, idx) => {
            const avg = sectionAvgRaw(sec.id)
            return (
              <View key={sec.id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: W.s_aspek }]}>{sec.label}</Text>
                {evaluations.map((ev) => (
                  <Text key={ev.evaluator.id} style={[styles.tableCellCenter, { width: W.s_ev }]}>
                    {sectionRaw(ev, sec.id)}
                  </Text>
                ))}
                <Text style={[styles.tableCellAccent, { width: W.s_avg }]}>
                  {avg != null ? avg.toFixed(1) : "—"}
                </Text>
                <Text style={[styles.tableCellCenter, { width: W.s_max, color: GRAY_TEXT }]}>
                  {sec.maxScore}
                </Text>
              </View>
            )
          })}

          {/* TOTAL row */}
          <View style={styles.totalRow}>
            <Text style={[styles.tableCellBold, { width: W.s_aspek }]}>TOTAL</Text>
            {evaluations.map((ev) => (
              <Text key={ev.evaluator.id} style={[styles.tableCellCenter, { width: W.s_ev, fontFamily: "Helvetica-Bold" }]}>
                {evalTotal(ev)}
              </Text>
            ))}
            <Text style={[styles.tableCellAccent, { width: W.s_avg, fontSize: 8 }]}>
              {avgRawTotal != null ? avgRawTotal.toFixed(1) : "—"}
            </Text>
            <Text style={[styles.tableCellCenter, { width: W.s_max, color: GRAY_TEXT, fontFamily: "Helvetica-Bold" }]}>
              100
            </Text>
          </View>

          {/* PREDIKAT row */}
          {grade && (
            <View style={[styles.tableRow, { backgroundColor: grade.bg, height: 18 }]}>
              <Text style={[styles.tableCellBold, { width: W.s_aspek }]}>PREDIKAT</Text>
              {evaluations.map((ev) => (
                <Text key={ev.evaluator.id} style={[styles.tableCellCenter, { width: W.s_ev, fontSize: 7, fontFamily: "Helvetica-Bold", color: grade.color }]}>
                  {perEvGrade(evalTotal(ev))}
                </Text>
              ))}
              <Text style={[styles.tableCellAccent, { width: W.s_avg }]}>{grade.label}</Text>
              <Text style={[styles.tableCellCenter, { width: W.s_max, color: GRAY_TEXT }]}>—</Text>
            </View>
          )}
        </View>

        {/* Grade box — compact horizontal row */}
        {displayAvg != null && grade && (
          <View style={[styles.gradeBox, { backgroundColor: gradeBg(grade.label), flexDirection: "row", alignItems: "center", padding: 8, marginTop: 6, marginBottom: 6 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.gradeLabel, { fontSize: 8, marginBottom: 3 }]}>NILAI AKHIR (RATA-RATA)</Text>
              <View style={[styles.gradeBadge, { backgroundColor: grade.bg, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3 }]}>
                <Text style={[styles.gradeBadgeText, { color: grade.color, fontSize: 9 }]}>{grade.label}</Text>
              </View>
            </View>
            <Text style={[styles.gradeScore, { fontSize: 26 }]}>
              {displayAvg.toFixed(2)}
              <Text style={{ fontSize: 13, color: GRAY_TEXT }}>{" "}/ 4.00</Text>
            </Text>
          </View>
        )}

        {/* Notes */}
        <Text style={styles.sectionHeading}>Catatan Penilai</Text>
        <View style={styles.notesBlock}>
          {evaluations.some((ev) => ev.catatan) ? (
            evaluations.map((ev) =>
              ev.catatan ? (
                <View key={ev.evaluator.id} style={styles.noteItem}>
                  <Text style={styles.noteEvaluatorName}>{ev.evaluator.name}</Text>
                  <Text style={styles.noteText}>{ev.catatan}</Text>
                </View>
              ) : null,
            )
          ) : (
            <Text style={{ fontSize: 8, color: GRAY_TEXT, fontFamily: "Helvetica-Oblique" }}>-</Text>
          )}
        </View>

        {/* Date line — right-aligned, above signature columns */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 14 }}>
          <Text style={{ fontSize: 8, color: GRAY_TEXT }}>
            {org.city || "Jakarta"}, {formatDateId(generatedAt)}
          </Text>
        </View>

        {/* Signature block */}
        <View style={[styles.signatureBlock, { marginTop: 6 }]}>
          {/* Kepala Sekolah */}
          <View style={styles.signatureCol}>
            <Text style={styles.signatureLabel}>Mengetahui,{"\n"}Kepala Sekolah</Text>
            <View style={{ height: 50 }} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{org.kepalaSekolah || "_______________"}</Text>
          </View>
          {/* Guru yang dinilai */}
          <View style={styles.signatureCol}>
            <Text style={styles.signatureLabel}>Guru Mata Pelajaran</Text>
            <View style={{ height: 50 }} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{teacher.name}</Text>
          </View>
          {/* Ketua */}
          <View style={styles.signatureCol}>
            <Text style={styles.signatureLabel}>Mengetahui,{"\n"}{org.ketuaTitle || "Ketua Balitbang SDM"}</Text>
            <View style={{ height: 50 }} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{org.ketuaName || "_______________"}</Text>
          </View>
        </View>

        <PageFooter current={1} total={2} />
      </Page>

      {/* ══ PAGE 2 ══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <KopSurat org={org} />
        <View style={styles.rule} />
        <View style={[styles.titleBlock, { paddingVertical: 3 }]}>
          <Text style={[styles.titleMain, { fontSize: 12 }]}>DETAIL PENILAIAN PER KRITERIA</Text>
        </View>

        {sections.map((sec) => (
          // wrap={false} keeps the entire section (header + all rows + subtotal) together —
          // if it doesn't fit on the current page it moves as a unit to the next page
          <View key={sec.id} style={{ marginBottom: 4 }} wrap={false}>
            <View style={[styles.detailSectionHeaderSm, { backgroundColor: sec.color }]}>
              <Text style={styles.detailSectionHeaderText}>
                ASPEK: {sec.label}  (Maks. {sec.maxScore} poin)
              </Text>
            </View>

            <View style={styles.tableHeaderRowSm}>
              <Text style={[styles.tableCellHeader, { width: W.d_crit, textAlign: "left" }]}>
                Kriteria
              </Text>
              {evaluations.map((ev) => (
                <Text key={ev.evaluator.id} style={[styles.tableCellHeader, { width: W.d_ev }]}>
                  {shortName(ev.evaluator.name)}
                </Text>
              ))}
              <Text style={[styles.tableCellHeader, { width: W.d_avg, color: ACCENT }]}>
                Rata-rata
              </Text>
            </View>

            {sec.criteria.map((c, ci) => {
              const vals = evaluations.map((ev) => ev.scores[c.id] ?? 0)
              const avg =
                evaluations.length > 0
                  ? vals.reduce((a, b) => a + b, 0) / evaluations.length
                  : null
              return (
                <View
                  key={c.id}
                  style={ci % 2 === 0 ? styles.tableRowSm : styles.tableRowAltSm}
                >
                  <Text style={[styles.tableCell, { width: W.d_crit }]}>{c.label}</Text>
                  {evaluations.map((ev) => (
                    <Text key={ev.evaluator.id} style={[styles.tableCellCenter, { width: W.d_ev }]}>
                      {ev.scores[c.id] ?? "—"}
                    </Text>
                  ))}
                  <Text style={[styles.tableCellAccent, { width: W.d_avg }]}>
                    {avg != null ? avg.toFixed(1) : "—"}
                  </Text>
                </View>
              )
            })}

            <View style={styles.totalRowSm}>
              <Text style={[styles.tableCellBold, { width: W.d_crit }]}>
                Subtotal {sec.label.split(" ")[0]}
              </Text>
              {evaluations.map((ev) => (
                <Text key={ev.evaluator.id} style={[styles.tableCellCenter, { width: W.d_ev, fontFamily: "Helvetica-Bold" }]}>
                  {sectionRaw(ev, sec.id)}
                </Text>
              ))}
              <Text style={[styles.tableCellAccent, { width: W.d_avg }]}>
                {sectionAvgRaw(sec.id) != null ? (sectionAvgRaw(sec.id) as number).toFixed(1) : "—"}
              </Text>
            </View>
          </View>
        ))}

        <PageFooter current={2} total={2} />
      </Page>
    </Document>
  )
}
