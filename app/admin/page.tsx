import { prisma } from "@/lib/prisma"
import { AdminTabs } from "@/components/admin/admin-tabs"
import { Database, GraduationCap, Briefcase, UserCheck } from "lucide-react"

export default async function AdminPage() {
  const [teachersWithCount, evaluatorsWithCount] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { evaluations: true } } },
    }),
    prisma.evaluator.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { evaluations: true } } },
    }),
  ])

  const guruData = teachersWithCount
    .filter((t) => t.role !== "staff")
    .map((t) => ({ id: t.id, name: t.name, role: t.role, evaluationCount: t._count.evaluations }))

  const staffData = teachersWithCount
    .filter((t) => t.role === "staff")
    .map((t) => ({ id: t.id, name: t.name, role: t.role, evaluationCount: t._count.evaluations }))

  const penilaiData = evaluatorsWithCount.map((e) => ({
    id: e.id,
    name: e.name,
    evaluationCount: e._count.evaluations,
  }))

  return (
    <div className="space-y-6 animate-in">
      {/* Header card */}
      <div className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0F2540 0%, #1E3A5F 65%, #2A4F7A 100%)", boxShadow: "0 4px 20px rgba(15,37,64,0.22)" }}>
        <div className="px-6 py-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(196,151,42,0.15)" }}>
                  <Database size={16} style={{ color: "#C4972A" }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(196,151,42,0.85)" }}>
                  SMP Al Fakhir · Admin
                </p>
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">Kelola Data Master</h1>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>Manajemen data guru, staf, dan penilai</p>
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap">
              {[
                { icon: GraduationCap, count: guruData.length, label: "Guru", color: "#C4972A" },
                { icon: Briefcase, count: staffData.length, label: "Staf", color: "#60A5FA" },
                { icon: UserCheck, count: penilaiData.length, label: "Penilai", color: "#34D399" },
              ].map(({ icon: Icon, count, label, color }) => (
                <div key={label} className="flex items-center gap-2.5 px-4 py-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <Icon size={16} style={{ color }} />
                  <div>
                    <div className="text-xl font-bold tabular-nums" style={{ color }}>{count}</div>
                    <div className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #B8860B, #C4972A, #E8B84B, #C4972A, #B8860B)" }} />
      </div>

      <AdminTabs guruData={guruData} staffData={staffData} penilaiData={penilaiData} />
    </div>
  )
}
