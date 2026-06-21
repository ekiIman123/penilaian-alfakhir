import { SECTIONS, getAllCriteriaIds } from "./rubrics"

export type Scores = Record<string, number>

export function calcSectionRaw(scores: Scores, sectionId: string): number {
  const section = SECTIONS.find((s) => s.id === sectionId)
  if (!section) return 0
  return section.criteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0)
}

export function calcSectionPct(scores: Scores, sectionId: string): number {
  const section = SECTIONS.find((s) => s.id === sectionId)
  if (!section || section.maxScore === 0) return 0
  return Math.round((calcSectionRaw(scores, sectionId) / section.maxScore) * 100)
}

export function calcTotal(scores: Scores): number {
  const ids = getAllCriteriaIds()
  const sum = ids.reduce((acc, id) => acc + (scores[id] ?? 0), 0)
  return sum / ids.length  // rata-rata per kriteria, skala 1.0–4.0
}

// Konversi skor mentah seksi ke skala 1.0–4.0
export function calcSectionAvg(scores: Scores, sectionId: string): number {
  const section = SECTIONS.find((s) => s.id === sectionId)
  if (!section) return 0
  const raw = calcSectionRaw(scores, sectionId)
  return raw * 4 / section.maxScore
}

export function calcAvgScores(scoreSets: Scores[]): Scores {
  const result: Scores = {}
  for (const id of getAllCriteriaIds()) {
    const vals = scoreSets.map((s) => s[id]).filter((v): v is number => v != null && v > 0)
    result[id] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  return result
}

export function calcAvgTotal(scoreSets: Scores[]): number | null {
  if (scoreSets.length === 0) return null
  const totals = scoreSets.map(calcTotal)
  return totals.reduce((a, b) => a + b, 0) / totals.length
}

export function calcAvgSectionRaw(scoreSets: Scores[], sectionId: string): number | null {
  if (scoreSets.length === 0) return null
  const vals = scoreSets.map((s) => calcSectionRaw(s, sectionId))
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function parseScores(json: string): Scores {
  try {
    return JSON.parse(json) as Scores
  } catch {
    return {}
  }
}
