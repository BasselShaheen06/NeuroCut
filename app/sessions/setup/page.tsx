"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"

const SETUP_STEPS = [
  {
    title: "Cone Placement",
    icon: "📐",
    color: "var(--color-cyan-500)",
    items: [
      "Place the **start cone** exactly **3 meters** from the screen.",
      "Place two **target cones** at a **45° angle**, 2m to the left and right of the start cone.",
      "Ensure the athlete has a clear, unobstructed path to both target cones.",
    ],
  },
  {
    title: "IMU Sensor Placement",
    icon: "📡",
    color: "var(--color-amber-500)",
    items: [
      "Secure the **left foot** IMU sensor to the athlete's **left distal tibia** (shin, just above the ankle) using an elastic strap.",
      "Secure the **right foot** IMU sensor to the athlete's **right distal tibia** in the same fashion.",
      "Verify sensor orientation: **X = mediolateral, Y = anteroposterior, Z = vertical**.",
      "Start the IMU recording app on **both** sensors **before** pressing 'Begin Protocol' below.",
    ],
  },
  {
    title: "Athlete Readiness",
    icon: "🏃",
    color: "var(--color-green-500)",
    items: [
      "Athlete assumes an **athletic stance** at the start cone, facing the screen.",
      "Instruct: *\"React ONLY after the color cue appears. Press the spacebar/key as fast as possible, then perform the indicated cut.\"*",
      "Ensure the athlete understands: **Green = Cut Left**, **Red = Cut Right**, **Blue = Stop/Decelerate**.",
    ],
  },
]

export default function SetupPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("sessionId")
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())

  const allChecked = checkedSteps.size === SETUP_STEPS.length

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-[var(--color-red-500)]">Missing Session</h1>
          <p className="text-[var(--color-text-secondary)]">No session ID was provided. Please start from the questionnaire.</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-disabled)] font-bold">
            Step 2 of 4
          </p>
          <h1 className="text-3xl font-display font-bold text-[var(--color-cyan-500)]">
            Physical Setup
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm max-w-xl mx-auto">
            Prepare the Y-Drill environment and IMU sensor before beginning the stimulus protocol.
            Confirm each step below.
          </p>
        </div>

        {/* Y-Drill Diagram */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-xl p-6 text-center">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-4">
            Y-Drill Configuration
          </div>
          <div className="relative mx-auto" style={{ width: 280, height: 220 }}>
            {/* Target cones */}
            <div className="absolute left-2 top-2 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-[var(--color-green-500)]/20 border-2 border-[var(--color-green-500)] flex items-center justify-center text-xs font-bold text-[var(--color-green-500)]">
                L
              </div>
              <span className="text-[10px] text-[var(--color-text-disabled)]">Cut Left</span>
            </div>
            <div className="absolute right-2 top-2 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-[var(--color-red-500)]/20 border-2 border-[var(--color-red-500)] flex items-center justify-center text-xs font-bold text-[var(--color-red-500)]">
                R
              </div>
              <span className="text-[10px] text-[var(--color-text-disabled)]">Cut Right</span>
            </div>
            {/* Lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 220" fill="none">
              <line x1="140" y1="180" x2="40" y2="40" stroke="var(--color-bg-border)" strokeWidth="2" strokeDasharray="6 4" />
              <line x1="140" y1="180" x2="240" y2="40" stroke="var(--color-bg-border)" strokeWidth="2" strokeDasharray="6 4" />
              <line x1="140" y1="180" x2="140" y2="60" stroke="var(--color-bg-border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              {/* 45° labels */}
              <text x="75" y="125" fill="var(--color-text-disabled)" fontSize="10" fontFamily="monospace">45°</text>
              <text x="195" y="125" fill="var(--color-text-disabled)" fontSize="10" fontFamily="monospace">45°</text>
              {/* 3m label */}
              <text x="148" y="130" fill="var(--color-amber-500)" fontSize="10" fontFamily="monospace">3m</text>
            </svg>
            {/* Start cone */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-[var(--color-amber-500)]/20 border-2 border-[var(--color-amber-500)] flex items-center justify-center text-xs font-bold text-[var(--color-amber-500)]">
                ▲
              </div>
              <span className="text-[10px] text-[var(--color-text-disabled)]">Start</span>
            </div>
            {/* Screen */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded px-4 py-1">
              <span className="text-[10px] font-mono text-[var(--color-cyan-500)]">SCREEN</span>
            </div>
          </div>
        </div>

        {/* Checklist Steps */}
        <div className="space-y-4">
          {SETUP_STEPS.map((step, idx) => {
            const checked = checkedSteps.has(idx)
            return (
              <div
                key={idx}
                onClick={() => toggleStep(idx)}
                className={`bg-[var(--color-bg-surface)] p-6 rounded-xl border cursor-pointer transition-all ${
                  checked
                    ? "border-[var(--color-green-500)]/50 bg-[var(--color-green-500)]/5"
                    : "border-[var(--color-bg-border)] hover:border-[var(--color-bg-border)]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      checked
                        ? "bg-[var(--color-green-500)] border-[var(--color-green-500)] text-white"
                        : "border-[var(--color-bg-border)]"
                    }`}
                  >
                    {checked && <span className="text-sm">✓</span>}
                  </div>

                  <div className="flex-1">
                    <h3
                      className="font-bold text-base mb-3 flex items-center gap-2"
                      style={{ color: step.color }}
                    >
                      <span>{step.icon}</span>
                      {step.title}
                    </h3>
                    <ul className="space-y-2">
                      {step.items.map((item, i) => (
                        <li
                          key={i}
                          className="text-sm text-[var(--color-text-secondary)] leading-relaxed pl-1"
                          dangerouslySetInnerHTML={{
                            __html: item
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--color-text-primary)]">$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                          }}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="sticky bottom-4 bg-[var(--color-bg-surface)]/95 backdrop-blur p-5 rounded-xl border border-[var(--color-bg-border)] shadow-2xl flex justify-between items-center">
          <div className="text-sm text-[var(--color-text-secondary)]">
            <span className={`font-mono font-bold text-lg ${allChecked ? "text-[var(--color-green-500)]" : "text-[var(--color-amber-500)]"}`}>
              {checkedSteps.size}/{SETUP_STEPS.length}
            </span>{" "}
            steps confirmed
          </div>
          <button
            onClick={() => router.push(`/sessions/new?sessionId=${sessionId}`)}
            disabled={!allChecked}
            className="px-8 py-3 bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold rounded-lg uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95"
          >
            Begin Protocol →
          </button>
        </div>

      </div>
    </main>
  )
}
