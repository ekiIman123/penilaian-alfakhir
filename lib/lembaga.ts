/**
 * Ketiga lembaga dulu punya pohon rute sendiri-sendiri yang isinya nyaris sama
 * persis, sehingga setiap perubahan harus disalin tiga kali. Sekarang semuanya
 * dilayani satu rute `/[lembaga]`, dan berkas ini yang menjadi daftar sahnya.
 */
export const LEMBAGA = {
  iysa: {
    label: "IYSA",
    tagline: "Indonesian Young Scientist Association",
    abbr: "IY",
  },
  icgi: {
    label: "ICGI",
    tagline: "Indonesian Center for Global Innovation",
    abbr: "IC",
  },
  iyora: {
    label: "IYORA",
    tagline: "Indonesian Young Researchers Association",
    abbr: "IO",
  },
} as const

export type LembagaSlug = keyof typeof LEMBAGA

export const LEMBAGA_SLUGS = Object.keys(LEMBAGA) as LembagaSlug[]

export function isLembaga(v: string | undefined | null): v is LembagaSlug {
  return !!v && v in LEMBAGA
}

export function lembagaLabel(slug: string): string {
  return isLembaga(slug) ? LEMBAGA[slug].label : slug.toUpperCase()
}

/** Peran yang boleh membuka, menutup, dan menerbitkan periode. */
export const PENGELOLA_PERIODE = [
  "supervisor", "ceo", "pm", "founder", "management", "superadmin",
] as const

/** Peran yang boleh mengubah pengaturan lembaga dan daftar anggota. */
export const PENGELOLA_LEMBAGA = [
  "supervisor", "founder", "management", "superadmin",
] as const

/** Peran manajemen puncak — melihat ketiga lembaga sekaligus. */
export const PERAN_PUNCAK = ["management", "founder", "superadmin"] as const

export function bolehKelolaPeriode(role: string): boolean {
  return (PENGELOLA_PERIODE as readonly string[]).includes(role)
}

export function bolehKelolaLembaga(role: string): boolean {
  return (PENGELOLA_LEMBAGA as readonly string[]).includes(role)
}

export function peranPuncak(role: string): boolean {
  return (PERAN_PUNCAK as readonly string[]).includes(role)
}

export const ROLE_LABEL: Record<string, string> = {
  staff:       "Staff",
  koordinator: "Koordinator",
  supervisor:  "Supervisor",
  ceo:         "CEO",
  pm:          "Project Manager",
  management:  "Management",
  founder:     "General Manager",
  superadmin:  "Super Admin",
}
