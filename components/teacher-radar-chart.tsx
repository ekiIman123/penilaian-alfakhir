"use client"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { EVALUATOR_COLORS } from "@/lib/rubrics"

interface Props {
  radarData: {
    subject: string
    maxScore: number
    [evaluatorName: string]: number | string
  }[]
  evaluatorNames: string[]
}

export function TeacherRadarChart({ radarData, evaluatorNames }: Props) {
  if (evaluatorNames.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm italic">
        Belum ada data penilaian
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#E5E7EB" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
        />
        <Tooltip
          formatter={(value, name) => [typeof value === "number" ? value.toFixed(1) : value, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {evaluatorNames.map((name, i) => (
          <Radar
            key={name}
            name={name.split(",")[0]}
            dataKey={name}
            stroke={EVALUATOR_COLORS[i % EVALUATOR_COLORS.length]}
            fill={EVALUATOR_COLORS[i % EVALUATOR_COLORS.length]}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  )
}
