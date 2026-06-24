import { SECTIONS, getAllCriteriaIds, Section } from "./rubrics"

export type Scores = Record<string, number>

export function calcSectionRaw(scores: Scores, sectionId: string, sections: Section[] = SECTIONS): number {
  const section = sections.find((s) => s.id === sectionId)
  if (!section) return 0
  return section.criteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0)
}

export function calcSectionPct(scores: Scores, sectionId: string, sections: Section[] = SECTIONS): number {
  const section = sections.find((s) => s.id === sectionId)
  if (!section || section.maxScore === 0) return 0
  return Math.round((calcSectionRaw(scores, sectionId, sections) / section.maxScore) * 100)
}

export function calcTotal(scores: Scores, sections: Section[] = SECTIONS): number {
  const ids = sections.flatMap((s) => s.criteria.map((c) => c.id))
  const sum = ids.reduce((acc, id) => acc + (scores[id] ?? 0), 0)
  return sum / ids.length  // rata-rata per kriteria, skala 1.0–4.0
}

// Konversi skor mentah seksi ke skala 1.0–4.0
export function calcSectionAvg(scores: Scores, sectionId: string, sections: Section[] = SECTIONS): number {
  const section = sections.find((s) => s.id === sectionId)
  if (!section) return 0
  const raw = calcSectionRaw(scores, sectionId, sections)
  return raw * 4 / section.maxScore
}

export function calcAvgScores(scoreSets: Scores[], sections: Section[] = SECTIONS): Scores {
  const result: Scores = {}
  const ids = sections.flatMap((s) => s.criteria.map((c) => c.id))
  for (const id of ids) {
    const vals = scoreSets.map((s) => s[id]).filter((v): v is number => v != null && v > 0)
    result[id] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  return result
}

export function calcAvgTotal(scoreSets: Scores[], sections: Section[] = SECTIONS): number | null {
  if (scoreSets.length === 0) return null
  const totals = scoreSets.map((s) => calcTotal(s, sections))
  return totals.reduce((a, b) => a + b, 0) / totals.length
}

export function calcAvgSectionRaw(scoreSets: Scores[], sectionId: string, sections: Section[] = SECTIONS): number | null {
  if (scoreSets.length === 0) return null
  const vals = scoreSets.map((s) => calcSectionRaw(s, sectionId, sections))
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function parseScores(json: string): Scores {
  try {
    return JSON.parse(json) as Scores
  } catch {
    return {}
  }
}
