"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"

interface RTAnalysisChartProps {
  trials: {
    trialIndex: number
    direction: string
    reactionTimeMs: number | null
  }[]
  meanRT: number
}

const DIRECTION_COLORS: Record<string, string> = {
  LEFT: "var(--color-green-500)",
  RIGHT: "var(--color-red-500)",
  STOP: "var(--color-cyan-500)",
}

export function RTAnalysisChart({ trials, meanRT }: RTAnalysisChartProps) {
  const data = trials
    .filter((t) => t.reactionTimeMs !== null && t.reactionTimeMs > 0)
    .map((t) => ({
      name: `T${t.trialIndex}`,
      rt: t.reactionTimeMs!,
      direction: t.direction,
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--color-text-disabled)] text-sm font-mono">
        No valid reaction time data
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-bg-border)] shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          Reaction Time Analysis
        </h3>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-green-500)]" />
            <span className="text-[var(--color-text-disabled)]">Left</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-red-500)]" />
            <span className="text-[var(--color-text-disabled)]">Right</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-cyan-500)]" />
            <span className="text-[var(--color-text-disabled)]">Stop</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-bg-border)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-bg-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-bg-border)" }}
            tickLine={false}
            tickFormatter={(v) => `${v}ms`}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-bg-border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--color-text-primary)",
            }}
            formatter={(value: unknown) => [`${(value as number).toFixed(1)} ms`, "RT"]}
          />
          <ReferenceLine
            y={meanRT}
            stroke="var(--color-amber-500)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Mean: ${meanRT.toFixed(0)}ms`,
              position: "right",
              fill: "var(--color-amber-500)",
              fontSize: 10,
            }}
          />
          <Bar dataKey="rt" radius={[4, 4, 0, 0]} barSize={28}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={DIRECTION_COLORS[entry.direction] ?? "var(--color-cyan-500)"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
