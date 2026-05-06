"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { submitAclRsi } from "@/app/actions/submitAclRsi"

// ─── ACL-RSI Question definitions (Webster, Feller & Lambros, 2008) ──────────
// The ACL-RSI uses a 100-mm Visual Analogue Scale (VAS) for each question.
// "reversed" = the LEFT anchor is the negative end (score must be flipped).
// Question order matches the validated instrument exactly.
const QUESTIONS = [
  { id: 1,  text: "Are you confident that you can perform at your previous level of sport participation?",              left: "Not at all confident",    right: "Fully confident",         reversed: false },
  { id: 2,  text: "Do you think you are likely to re-injury your knee by participating in your sport?",                 left: "Extremely likely",         right: "Not likely at all",       reversed: true  },
  { id: 3,  text: "Are you nervous about playing your sport?",                                                           left: "Extremely nervous",        right: "Not nervous at all",      reversed: true  },
  { id: 4,  text: "Are you confident that you could play your sport without concern for your knee?",                     left: "Not confident at all",     right: "Fully confident",         reversed: false },
  { id: 5,  text: "Do you find it frustrating to have to consider your knee with respect to your sport?",                left: "Extremely frustrating",    right: "Not at all frustrating",  reversed: true  },
  { id: 6,  text: "Are you fearful of re-injuring your knee by playing your sport?",                                     left: "Extremely fearful",        right: "No fear at all",          reversed: true  },
  { id: 7,  text: "Are you confident about your knee holding up under pressure?",                                        left: "Not confident at all",     right: "Fully confident",         reversed: false },
  { id: 8,  text: "Are you confident that you could play your sport without concern of your knee giving way?",           left: "Not confident at all",     right: "Fully confident",         reversed: false },
  { id: 9,  text: "Are you afraid of accidentally injuring your knee by playing your sport?",                            left: "Extremely afraid",         right: "Not afraid at all",       reversed: true  },
  { id: 10, text: "Do thoughts of having to go through surgery and rehabilitation again prevent you from playing your sport?", left: "All of the time",    right: "None of the time",        reversed: true  },
  { id: 11, text: "Are you confident about your ability to perform well at your sport?",                                 left: "Not confident at all",     right: "Fully confident",         reversed: false },
  { id: 12, text: "Do you feel relaxed about playing your sport?",                                                       left: "Not at all relaxed",       right: "Fully relaxed",           reversed: false },
]

// Colour for the slider fill based on normalized score
function sliderFillColour(value: number, reversed: boolean): string {
  const normalized = reversed ? 100 - value : value
  if (normalized <= 30) return "var(--color-red-500)"
  if (normalized <= 60) return "var(--color-amber-500)"
  return "var(--color-green-500)"
}

export default function AclRsiScreen() {
  const router = useRouter()
  // Answers stored as 0–100 VAS values (matching the clinical instrument)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [conditionType, setConditionType] = useState<"ST" | "DT">("ST")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const answered   = Object.keys(answers).length
  const isComplete = answered === 12
  const progress   = Math.round((answered / 12) * 100)

  const handleSliderChange = (qId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }

  const handleSubmit = () => {
    if (!isComplete || isPending) return
    setError(null)

    startTransition(async () => {
      const result = await submitAclRsi(answers, conditionType)
      if (!result.success) {
        setError(result.error ?? "Submission failed")
        return
      }
      router.push(`/sessions/setup?sessionId=${result.sessionId}`)
    })
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-disabled)] font-bold">
            Step 1 of 4
          </p>
          <h1 className="text-3xl font-display font-bold text-[var(--color-cyan-500)]">
            ACL-RSI Questionnaire
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm max-w-xl mx-auto">
            Rate how you feel about your knee in relation to your sport.
            There are no right or wrong answers — be honest.
          </p>
        </div>

        {/* ── Condition Type selector ──────────────────────────────── */}
        <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl border border-[var(--color-bg-border)]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-3">
            Session Condition
          </h3>
          <p className="text-xs text-[var(--color-text-disabled)] mb-4 leading-relaxed">
            Select the condition type for this assessment session. This determines how Dual-Task Cost (DTC) is computed.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConditionType("ST")}
              className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all border-2 ${
                conditionType === "ST"
                  ? "bg-[var(--color-cyan-500)]/15 border-[var(--color-cyan-500)] text-[var(--color-cyan-500)]"
                  : "bg-[var(--color-bg-elevated)] border-[var(--color-bg-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-bg-border)]"
              }`}
            >
              <span className="block text-lg mb-1">🏃</span>
              Single-Task (ST)
              <span className="block text-[10px] font-normal mt-1 normal-case tracking-normal text-[var(--color-text-disabled)]">
                Movement only — baseline
              </span>
            </button>
            <button
              onClick={() => setConditionType("DT")}
              className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all border-2 ${
                conditionType === "DT"
                  ? "bg-[var(--color-amber-500)]/15 border-[var(--color-amber-500)] text-[var(--color-amber-500)]"
                  : "bg-[var(--color-bg-elevated)] border-[var(--color-bg-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-bg-border)]"
              }`}
            >
              <span className="block text-lg mb-1">🧠</span>
              Dual-Task (DT)
              <span className="block text-[10px] font-normal mt-1 normal-case tracking-normal text-[var(--color-text-disabled)]">
                Movement + cognitive load
              </span>
            </button>
          </div>
        </div>

        {/* ── Progress bar ───────────────────────────────────────── */}
        <div className="w-full bg-[var(--color-bg-elevated)] rounded-full h-1.5">
          <div
            className="bg-[var(--color-cyan-500)] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ── Questions with VAS Sliders ───────────────────────────── */}
        <div className="space-y-6">
          {QUESTIONS.map((q, idx) => {
            const value = answers[q.id]
            const isAnswered = value !== undefined
            const displayValue = isAnswered ? value : 50

            return (
              <div
                key={q.id}
                className={`bg-[var(--color-bg-surface)] p-6 rounded-xl border transition-colors ${
                  isAnswered
                    ? "border-[var(--color-bg-border)]"
                    : "border-[var(--color-bg-border)] hover:border-[var(--color-cyan-500)]/40"
                }`}
              >
                <p className="font-semibold text-[var(--color-text-primary)] mb-5 leading-snug">
                  <span className="text-[var(--color-cyan-500)] font-mono mr-2 text-sm">
                    {idx + 1}.
                  </span>
                  {q.text}
                </p>

                {/* VAS Slider */}
                <div className="relative px-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={displayValue}
                    onChange={(e) => handleSliderChange(q.id, parseInt(e.target.value, 10))}
                    className="vas-slider w-full"
                    style={{
                      "--slider-fill": isAnswered
                        ? sliderFillColour(value, q.reversed)
                        : "var(--color-bg-border)",
                      "--slider-pct": `${displayValue}%`,
                    } as React.CSSProperties}
                  />
                  {/* Numeric value display */}
                  <div
                    className="absolute -top-7 transform -translate-x-1/2 text-xs font-mono font-bold transition-opacity"
                    style={{
                      left: `${displayValue}%`,
                      opacity: isAnswered ? 1 : 0,
                      color: isAnswered
                        ? sliderFillColour(value, q.reversed)
                        : "var(--color-text-disabled)",
                    }}
                  >
                    {displayValue}
                  </div>
                </div>

                {/* Anchor labels */}
                <div className="flex justify-between mt-2 text-[11px] font-semibold">
                  <span style={{ color: q.reversed ? "var(--color-red-500)" : "var(--color-text-disabled)" }}>
                    {q.left}
                  </span>
                  <span style={{ color: q.reversed ? "var(--color-text-disabled)" : "var(--color-green-500)" }}>
                    {q.right}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Sticky footer ──────────────────────────────────────── */}
        <div className="sticky bottom-4 bg-[var(--color-bg-surface)]/95 backdrop-blur p-5 rounded-xl border border-[var(--color-bg-border)] shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm flex items-center gap-3">
            <span className="text-[var(--color-text-secondary)]">Progress</span>
            <span className={`font-mono font-bold text-lg ${isComplete ? "text-[var(--color-green-500)]" : "text-[var(--color-amber-500)]"}`}>
              {answered} / 12
            </span>
            {!isComplete && (
              <span className="text-[var(--color-text-disabled)] text-xs">
                ({12 - answered} remaining)
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            {error && (
              <p className="text-[var(--color-red-500)] text-xs font-bold">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isComplete || isPending}
              className="px-8 py-3 bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold rounded-lg uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95"
            >
              {isPending ? "Saving…" : "Submit & Continue →"}
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}