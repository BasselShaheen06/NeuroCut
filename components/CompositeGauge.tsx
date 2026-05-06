"use client"

import { motion } from "framer-motion"

interface CompositeGaugeProps {
  score: number
  recommendation: string
  breakdown: {
    label: string
    score: number
    weight: number
    color: string
  }[]
}

export function CompositeGauge({ score, recommendation, breakdown }: CompositeGaugeProps) {
  const circumference = 2 * Math.PI * 54
  const progress = (score / 100) * circumference

  const getColor = () => {
    if (score >= 75) return "var(--color-green-500)"
    if (score >= 55) return "var(--color-amber-500)"
    return "var(--color-red-500)"
  }

  const getBadgeClass = () => {
    switch (recommendation) {
      case "CLEARED":
        return "bg-[var(--color-green-500)]/15 text-[var(--color-green-500)] border-[var(--color-green-500)]"
      case "CONDITIONAL":
        return "bg-[var(--color-amber-500)]/15 text-[var(--color-amber-500)] border-[var(--color-amber-500)]"
      case "WITHHELD":
        return "bg-[var(--color-red-500)]/15 text-[var(--color-red-500)] border-[var(--color-red-500)]"
      default:
        return "bg-[var(--color-text-disabled)]/15 text-[var(--color-text-disabled)] border-[var(--color-text-disabled)]"
    }
  }

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-bg-border)] shadow-sm p-6">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-6 text-center">
        Composite Readiness Score
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--color-bg-elevated)"
              strokeWidth="8"
            />
            {/* Progress ring */}
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={getColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              transform="rotate(-90 60 60)"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-mono font-bold"
              style={{ color: getColor() }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {score.toFixed(0)}
            </motion.span>
            <span className="text-[10px] text-[var(--color-text-disabled)] uppercase tracking-wider">
              / 100
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 w-full space-y-3">
          {breakdown.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--color-text-disabled)]">
                    {(item.weight * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: item.color }}>
                    {item.score.toFixed(0)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-[var(--color-bg-elevated)] rounded-full h-1.5">
                <motion.div
                  className="h-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, item.score)}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          ))}

          {/* Recommendation badge */}
          <motion.div
            className="pt-3 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-bold border-2 uppercase tracking-wider ${getBadgeClass()}`}
            >
              {recommendation}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
