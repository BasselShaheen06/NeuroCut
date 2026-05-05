"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { submitAclRsi } from "@/app/actions/submitAclRsi"

// ─── Question definitions ────────────────────────────────────────────────────
// "reversed" = the LEFT anchor is the bad end (0 = worst, 10 = best after flip)
// For display we always show left label on the left; scoring handles the flip.
const QUESTIONS = [
  { id: 1,  text: "Are you confident that you can perform at your previous level of sport participation?",              left: "Not at all confident",   right: "Fully confident",        reversed: false },
  { id: 2,  text: "Do you think you are likely to re-injure your knee by participating in your sport?",                left: "Extremely likely",        right: "Not likely at all",      reversed: true  },
  { id: 3,  text: "Are you nervous about playing your sport?",                                                          left: "Extremely nervous",       right: "Not nervous at all",     reversed: true  },
  { id: 4,  text: "Are you confident that your knee will not give way by playing your sport?",                          left: "Not at all confident",   right: "Fully confident",        reversed: false },
  { id: 5,  text: "Are you confident that you could play your sport without concern for your knee?",                    left: "Not at all confident",   right: "Fully confident",        reversed: false },
  { id: 6,  text: "Do you find it frustrating to have to consider your knee with respect to your sport?",               left: "Extremely frustrating",   right: "Not at all frustrating", reversed: true  },
  { id: 7,  text: "Are you fearful of re-injuring your knee by playing your sport?",                                    left: "Extremely fearful",       right: "No fear at all",         reversed: true  },
  { id: 8,  text: "Are you confident about your knee holding up under pressure?",                                       left: "Not at all confident",   right: "Fully confident",        reversed: false },
  { id: 9,  text: "Are you afraid of accidentally injuring your knee by playing your sport?",                           left: "Extremely afraid",        right: "Not at all afraid",      reversed: true  },
  { id: 10, text: "Do thoughts of having to go through surgery and rehabilitation prevent you from playing your sport?", left: "All of the time",         right: "None of the time",       reversed: true  },
  { id: 11, text: "Are you confident about your ability to perform well at your sport?",                                left: "Not at all confident",   right: "Fully confident",        reversed: false },
  { id: 12, text: "Do you feel relaxed about playing your sport?",                                                      left: "Not at all relaxed",      right: "Fully relaxed",          reversed: false },
]

// Colour of the selected button varies by question polarity so the scale
// feels semantically correct (green = good end, amber = bad end)
function buttonColour(qId: number, value: number, reversed: boolean): string {
  // For reversed questions: 0 is bad (amber end), 10 is good (green end after flip)
  // We colour based on the NORMALIZED value so it always feels right
  const normalized = reversed ? 10 - value : value
  if (normalized <= 3) return "bg-[var(--color-red-500)]   text-white scale-110 shadow-md"
  if (normalized <= 6) return "bg-[var(--color-amber-500)] text-white scale-110 shadow-md"
  return                      "bg-[var(--color-green-500)] text-[var(--color-bg-base)] scale-110 shadow-md"
}

export default function AclRsiScreen() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const answered    = Object.keys(answers).length
  const isComplete  = answered === 12
  const progress    = Math.round((answered / 12) * 100)

  const handleSelect = (qId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }

  const handleSubmit = () => {
    if (!isComplete || isPending) return
    setError(null)

    startTransition(async () => {
      const result = await submitAclRsi(answers)
      if (!result.success) {
        setError(result.error ?? "Submission failed")
        return
      }
      // Redirect to setup video page, carrying the new sessionId
      router.push(`/sessions/setup?sessionId=${result.sessionId}`)
    })
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-disabled)] font-bold">
            Step 1 of 3
          </p>
          <h1 className="text-3xl font-display font-bold text-[var(--color-cyan-500)]">
            ACL-RSI Questionnaire
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm max-w-xl mx-auto">
            Rate how you feel about your knee in relation to your sport.
            There are no right or wrong answers — be honest.
          </p>
        </div>

        {/* ── Progress bar ───────────────────────────────────────── */}
        <div className="w-full bg-[var(--color-bg-elevated)] rounded-full h-1.5">
          <div
            className="bg-[var(--color-cyan-500)] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ── Questions ──────────────────────────────────────────── */}
        <div className="space-y-6">
          {QUESTIONS.map((q, idx) => {
            const selected = answers[q.id]
            const isAnswered = selected !== undefined

            return (
              <div
                key={q.id}
                className={`bg-[var(--color-bg-surface)] p-6 rounded-xl border transition-colors ${
                  isAnswered
                    ? "border-[var(--color-bg-border)]"
                    : "border-[var(--color-bg-border)] hover:border-[var(--color-cyan-500)]/40"
                }`}
              >
                {/* Question text */}
                <p className="font-semibold text-[var(--color-text-primary)] mb-4 leading-snug">
                  <span className="text-[var(--color-cyan-500)] font-mono mr-2 text-sm">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {q.text}
                </p>

                {/* Anchor labels */}
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-disabled)] mb-3 px-0.5">
                  <span>{q.left}</span>
                  <span>{q.right}</span>
                </div>

                {/* 0–10 scale */}
                <div className="flex gap-1">
                  {Array.from({ length: 11 }, (_, i) => i).map((num) => {
                    const isSelected = selected === num
                    return (
                      <button
                        key={num}
                        onClick={() => handleSelect(q.id, num)}
                        className={`flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-all ${
                          isSelected
                            ? buttonColour(q.id, num, q.reversed)
                            : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-border)] hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        {num}
                      </button>
                    )
                  })}
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