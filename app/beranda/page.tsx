import { redirect } from "next/navigation"
import { getAccountSession, getSession } from "@/lib/lembaga-auth"
import { getEvaluatees } from "@/lib/lembaga-evaluatees"
import { resolvePeriod } from "@/lib/periods"
import { bangunPeta, baganPerhatian } from "@/lib/overview"
import { peranPuncak, isLembaga } from "@/lib/lembaga"
import { prisma } from "@/lib/prisma"
import { PetaLembaga } from "@/components/beranda/PetaLembaga"

export const dynamic = "force-dynamic"

/**
 * Pintu masuk setelah login.
 *
 * Manajemen mendapat peta lintas lembaga — mereka pembaca hasil terbanyak,
 * bukan pengisi form terbanyak. Peran lain langsung diantar ke dashboard
 * lembaganya, karena di sana memang pekerjaannya.
 */
export default async function BerandaPage() {
  const akun = await getAccountSession()
  if (!akun) redirect("/iysa")

  const punyaPeranPuncak =
    akun.isSuperadmin || akun.hats.some((h) => peranPuncak(h.role))

  if (!punyaPeranPuncak) {
    const pertama = akun.hats[0]
    redirect(pertama ? `/${pertama.lembaga}/dashboard` : "/iysa")
  }

  const [peta, perhatian] = await Promise.all([bangunPeta(6), baganPerhatian()])

  // Berapa orang yang belum dinilai manajemen ini, per lembaga.
  const lembagaSaya = akun.isSuperadmin
    ? []
    : [...new Set(akun.hats.map((h) => h.lembaga))].filter(isLembaga)

  const tugasSaya = await Promise.all(
    lembagaSaya.map(async (lembaga) => {
      const session = await getSession(lembaga)
      if (!session) return null
      const [period, evaluatees] = await Promise.all([
        resolvePeriod(lembaga),
        getEvaluatees(session, lembaga),
      ])
      if (evaluatees.length === 0) return null
      const sudah = await prisma.evaluation.count({
        where: {
          periodId: period.id,
          evaluatorId: session.evaluatorId,
          status: "terkirim",
          employeeId: { in: evaluatees.map((e) => e.id) },
        },
      })
      return {
        lembaga,
        label: period.label,
        periodId: period.id,
        belum: evaluatees.length - sudah,
        total: evaluatees.length,
      }
    }),
  )

  return (
    <PetaLembaga
      nama={akun.name}
      peta={peta}
      perhatian={perhatian}
      tugasSaya={tugasSaya.filter((t): t is NonNullable<typeof t> => t !== null)}
    />
  )
}
