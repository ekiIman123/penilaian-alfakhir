import { prisma } from "@/lib/prisma"
import { ManageList } from "@/components/admin/manage-list"
import { Database, Users, UserCheck } from "lucide-react"

export default async function AdminPage() {
  const [teachersWithCount, evaluatorsWithCount] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { evaluations: true } } },
    }),
    prisma.evaluator.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { evaluations: true } } },
    }),
  ])

  const guruData = teachersWithCount.map((t) => ({
    id: t.id,
    name: t.name,
    evaluationCount: t._count.evaluations,
  }))

  const penilaiData = evaluatorsWithCount.map((e) => ({
    id: e.id,
    name: e.name,
    evaluationCount: e._count.evaluations,
  }))

  return (
    <div className="space-y-6 animate-in">
      {/* Hero header */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1C0E04 0%, #3B2008 60%, #5C3D11 100%)",
          boxShadow: "0 4px 32px rgba(28,14,4,0.35)",
        }}
      >
        <div className="px-6 py-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Left: title */}
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(196,151,42,0.18)" }}
                >
                  <Database size={18} style={{ color: "#C4972A" }} />
                </div>
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(196,151,42,0.85)" }}
                >
                  SMP Al Fakhir · Admin
                </p>
              </div>
              <h1 className="text-2xl font-black text-white leading-tight">
                Kelola Data Master
              </h1>
              <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                Manajemen data guru dan penilai SMP Al Fakhir
              </p>
            </div>

            {/* Right: stat chips */}
            <div className="flex gap-3 shrink-0">
              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: "rgba(255,255,255,0.11)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <Users size={18} style={{ color: "#C4972A" }} />
                <div>
                  <div
                    className="text-2xl font-black tabular-nums"
                    style={{ color: "#C4972A", textShadow: "0 0 12px rgba(196,151,42,0.4)" }}
                  >
                    {guruData.length}
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Guru
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: "rgba(255,255,255,0.11)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <UserCheck size={18} style={{ color: "#22C55E" }} />
                <div>
                  <div
                    className="text-2xl font-black tabular-nums"
                    style={{ color: "#22C55E", textShadow: "0 0 12px rgba(34,197,94,0.4)" }}
                  >
                    {penilaiData.length}
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Penilai
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* gold bottom rule */}
        <div style={{ height: "2px", background: "linear-gradient(90deg, #C4972A, #E8B84B, #C4972A)" }} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Guru column */}
        <div className="card p-5">
          <ManageList people={guruData} type="guru" />
        </div>

        {/* Penilai column */}
        <div className="card p-5">
          <ManageList people={penilaiData} type="penilai" />
        </div>
      </div>
    </div>
  )
}
