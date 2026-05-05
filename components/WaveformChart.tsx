"use client"

import {
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type WaveformPoint = { t: number; g: number }
type CueMarker = {
  trialIndex: number
  direction: string
  cuedAt: number | null
  respondedAt: number | null
  reactionTimeMs: number | null
}

interface WaveformChartProps {
  waveform: WaveformPoint[]
  cues: CueMarker[]
  /** The trial index to focus on (1-based). Shows cue + onset markers for that trial only. */
  activeTrial?: number
}

const DIRECTION_COLORS: Record<string, string> = {
  LEFT:  "var(--color-green-500)",
  RIGHT: "var(--color-red-500)",
  STOP:  "var(--color-cyan-500)",
}

export function WaveformChart({ waveform, cues, activeTrial }: WaveformChartProps) {
  if (!waveform || waveform.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--color-text-disabled)] text-sm font-mono">
        No waveform data available
      </div>
    )
  }

  // Normalise timestamps to seconds-from-start so the X axis is readable
  const t0 = waveform[0].t
  const data = waveform.map((p) => ({ t: (p.t - t0) / 1000, g: p.g }))

  // Which cues to overlay
  const visibleCues = activeTrial
    ? cues.filter((c) => c.trialIndex === activeTrial)
    : cues

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-bg-border)"
          vertical={false}
        />

        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v) => `${v.toFixed(1)}s`}
          tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--color-bg-border)" }}
          tickLine={false}
          label={{
            value: "Time (s)",
            position: "insideBottomRight",
            offset: -8,
            fill: "var(--color-text-disabled)",
            fontSize: 11,
          }}
        />

        <YAxis
          dataKey="g"
          domain={[0, "auto"]}
          tickFormatter={(v) => `${v.toFixed(1)}g`}
          tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--color-bg-border)" }}
          tickLine={false}
          width={44}
        />

        <Tooltip
          contentStyle={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-bg-border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--color-text-primary)",
          }}
          formatter={(value: unknown) => [`${(value as number).toFixed(3)} g`, "Magnitude"]}
          labelFormatter={(label: unknown) => `t = ${(label as number).toFixed(3)} s`}
        />

        <Legend
          wrapperStyle={{ fontSize: 11, color: "var(--color-text-secondary)" }}
        />

        {/* IMU acceleration magnitude */}
        <Line
          type="monotone"
          dataKey="g"
          name="Accel. Magnitude (g)"
          dot={false}
          strokeWidth={1.5}
          stroke="var(--color-cyan-500)"
          isAnimationActive={false}
        />

        {/* Visual Cue markers */}
        {visibleCues.map((cue) =>
          cue.cuedAt != null ? (
            <ReferenceLine
              key={`cue-${cue.trialIndex}`}
              x={(cue.cuedAt - t0) / 1000}
              stroke={DIRECTION_COLORS[cue.direction] ?? "var(--color-amber-500)"}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `T${cue.trialIndex} Cue`,
                position: "top",
                fill: DIRECTION_COLORS[cue.direction] ?? "var(--color-amber-500)",
                fontSize: 10,
              }}
            />
          ) : null
        )}

        {/* Motor Onset markers */}
        {visibleCues.map((cue) =>
          cue.respondedAt != null ? (
            <ReferenceLine
              key={`onset-${cue.trialIndex}`}
              x={(cue.respondedAt - t0) / 1000}
              stroke="var(--color-amber-500)"
              strokeWidth={2}
              label={{
                value: `T${cue.trialIndex} Onset`,
                position: "insideTopRight",
                fill: "var(--color-amber-500)",
                fontSize: 10,
              }}
            />
          ) : null
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}