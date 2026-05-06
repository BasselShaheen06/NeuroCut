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
} from "recharts"

interface FeatureImportanceChartProps {
  importances: Record<string, number>
}

// Human-readable labels for the model features
const FEATURE_LABELS: Record<string, string> = {
  rolling_cv_clearances_min: "Clearance CV (Min)",
  rolling_std_clearances_min: "Clearance Std (Min)",
  rolling_mean_SI_stance_ratios: "Stance Ratio SI (Mean)",
  rolling_std_stride_lengths: "Stride Length Std",
  rolling_std_stride_times: "Stride Time Std",
  rolling_std_clearances_max: "Clearance Std (Max)",
  rolling_std_swing_times: "Swing Time Std",
  rolling_mean_SI_stride_lengths: "Stride Length SI (Mean)",
}

// Color gradient based on importance value
function getBarColor(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0
  if (ratio > 0.7) return "var(--color-red-500)"
  if (ratio > 0.4) return "var(--color-amber-500)"
  return "var(--color-cyan-500)"
}

export default function FeatureImportanceChart({
  importances,
}: FeatureImportanceChartProps) {
  // Convert to sorted array for the chart
  const data = Object.entries(importances)
    .map(([key, value]) => ({
      name: FEATURE_LABELS[key] || key,
      importance: parseFloat(value.toFixed(4)),
    }))
    .sort((a, b) => b.importance - a.importance)

  const maxImportance = data.length > 0 ? data[0].importance : 0

  if (data.length === 0) {
    return (
      <div className="text-center text-[var(--color-text-disabled)] py-8 text-sm">
        No feature importance data available.
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">
        Feature Importance (Random Forest)
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 32)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-bg-border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "var(--color-text-disabled)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-bg-border)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-bg-border)" }}
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-bg-border)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              fontSize: "12px",
            }}
            formatter={(value) => [Number(value).toFixed(4), "Importance"]}
          />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.importance, maxImportance)}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-[var(--color-text-disabled)] mt-2 text-center">
        Higher values indicate features with greater influence on the DT vs ST classification
      </p>
    </div>
  )
}
