"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { saveStimulusRuns } from "@/app/actions/saveStimulusRuns"

// Clinical cues optimized for distance visibility and dual-task processing
const STIMULI = [
  { direction: "LEFT",  color: "bg-[var(--color-green-500)]", symbol: "←", label: "Cut Left" },
  { direction: "RIGHT", color: "bg-[var(--color-red-500)]",   symbol: "→", label: "Cut Right" },
  { direction: "STOP",  color: "bg-[var(--color-cyan-500)]",  symbol: "■", label: "Decelerate/Stop" },
]

type TrialResult = {
  trialIndex: number
  direction: string
  cuedAt: number           // Date.now() — absolute Unix timestamp for IMU sync
  respondedAt: number      // Date.now() at keypress — for IMU sync
  reactionTimeMs: number   // performance.now() delta — high-precision cognitive RT
}

const TOTAL_TRIALS = 5

export default function ClinicalTriggerScreen() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("sessionId")

  // State machine: setup -> ready -> delay -> cued -> inter -> finished
  const [testState, setTestState] = useState<
    "setup" | "ready" | "delay" | "cued" | "inter" | "finished"
  >("setup")
  const [currentTrial, setCurrentTrial] = useState(0)
  const [trialResults, setTrialResults] = useState<TrialResult[]>([])
  const [activeStimulus, setActiveStimulus] = useState<typeof STIMULI[0] | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // High-precision timing refs (performance.now() is monotonic, can't be reset)
  const cueTimeRef = useRef<number>(0)       // performance.now() when cue shown
  const cueAbsoluteRef = useRef<number>(0)   // Date.now() when cue shown (for IMU sync)
  const hasRespondedRef = useRef<boolean>(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // ─── Fire a single trial ──────────────────────────────────────────────────
  const startTrialSequence = useCallback(() => {
    if (testState !== "ready") return

    setTestState("delay")
    hasRespondedRef.current = false

    // Unanticipated delay (1.5s–3.5s): prevents pre-activation of motor units
    const delayMs = Math.floor(Math.random() * 2000) + 1500

    timeoutRef.current = setTimeout(() => {
      const randomStimulus = STIMULI[Math.floor(Math.random() * STIMULI.length)]
      setActiveStimulus(randomStimulus)
      setTestState("cued")

      // CRITICAL: Capture both timing sources at the exact same moment
      cueTimeRef.current = performance.now()      // High-precision for RT calc
      cueAbsoluteRef.current = Date.now()          // Absolute for IMU synchronisation
    }, delayMs)
  }, [testState])

  // ─── Handle player keypress (reaction) ────────────────────────────────────
  const handleResponse = useCallback(() => {
    if (testState !== "cued" || hasRespondedRef.current || !activeStimulus) return
    hasRespondedRef.current = true

    const responseTime = performance.now()
    const responseAbsolute = Date.now()
    const reactionTimeMs = responseTime - cueTimeRef.current

    const result: TrialResult = {
      trialIndex: currentTrial + 1,
      direction: activeStimulus.direction,
      cuedAt: cueAbsoluteRef.current,
      respondedAt: responseAbsolute,
      reactionTimeMs: Math.round(reactionTimeMs * 100) / 100, // round to 0.01ms
    }

    setTrialResults((prev) => [...prev, result])
    setTestState("inter")

    // Brief inter-trial interval (800ms) before next trial
    setTimeout(() => {
      if (currentTrial + 1 >= TOTAL_TRIALS) {
        setTestState("finished")
      } else {
        setCurrentTrial((prev) => prev + 1)
        setTestState("ready")
        setActiveStimulus(null)
      }
    }, 800)
  }, [testState, currentTrial, activeStimulus])

  // ─── Keyboard listener ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter" || e.code === "KeyF") {
        e.preventDefault()
        if (testState === "ready") {
          startTrialSequence()
        } else if (testState === "cued") {
          handleResponse()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [startTrialSequence, handleResponse, testState])

  // ─── Auto-timeout: if player doesn't respond within 2s, record as missed ─
  useEffect(() => {
    if (testState !== "cued") return

    const timeout = setTimeout(() => {
      if (!hasRespondedRef.current && activeStimulus) {
        hasRespondedRef.current = true

        const result: TrialResult = {
          trialIndex: currentTrial + 1,
          direction: activeStimulus.direction,
          cuedAt: cueAbsoluteRef.current,
          respondedAt: 0,       // 0 indicates no response
          reactionTimeMs: -1,   // -1 indicates timeout/missed
        }
        setTrialResults((prev) => [...prev, result])
        setTestState("inter")

        setTimeout(() => {
          if (currentTrial + 1 >= TOTAL_TRIALS) {
            setTestState("finished")
          } else {
            setCurrentTrial((prev) => prev + 1)
            setTestState("ready")
            setActiveStimulus(null)
          }
        }, 800)
      }
    }, 2000)

    return () => clearTimeout(timeout)
  }, [testState, currentTrial, activeStimulus])

  // ─── UI: Setup Screen ─────────────────────────────────────────────────────
  if (testState === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--color-bg-base)]">
        <div className="max-w-2xl w-full bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-2">
            Step 3 of 4
          </p>
          <h1 className="text-2xl font-display font-bold text-[var(--color-cyan-500)] mb-2">
            Reactive Y-Drill Protocol
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
            Dual-task color-cue reaction time measurement — Chaaban et al. (2023).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg border border-[var(--color-bg-border)]">
              <h3 className="font-bold text-[var(--color-amber-500)] mb-2 text-sm uppercase">Color Cues</h3>
              <div className="space-y-2">
                {STIMULI.map((s) => (
                  <div key={s.direction} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded ${s.color}`} />
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      <strong className="text-[var(--color-text-primary)]">{s.symbol}</strong> = {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg border border-[var(--color-bg-border)]">
              <h3 className="font-bold text-[var(--color-cyan-500)] mb-2 text-sm uppercase">Instructions</h3>
              <ul className="text-sm space-y-2 text-[var(--color-text-secondary)] list-disc pl-4">
                <li>Press <strong className="text-[var(--color-text-primary)]">Spacebar</strong> to start each trial.</li>
                <li>When the color appears, press <strong className="text-[var(--color-text-primary)]">Spacebar</strong> as fast as possible.</li>
                <li>Your reaction time is measured with sub-millisecond precision.</li>
                <li>If you don't respond within 2 seconds, the trial is marked as missed.</li>
              </ul>
            </div>
          </div>

          <div className="text-center text-sm text-[var(--color-text-disabled)] mb-4 font-mono">
            Session: {sessionId?.slice(0, 8) ?? "—"} &nbsp;·&nbsp; Trials: {TOTAL_TRIALS}
          </div>

          <button
            onClick={() => setTestState("ready")}
            className="w-full bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-4 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            I Understand — Begin Protocol
          </button>
        </div>
      </main>
    )
  }

  // ─── UI: Finished Screen ──────────────────────────────────────────────────
  if (testState === "finished") {
    const validTrials = trialResults.filter((r) => r.reactionTimeMs > 0)
    const avgRT = validTrials.length > 0
      ? validTrials.reduce((s, r) => s + r.reactionTimeMs, 0) / validTrials.length
      : 0
    const missedCount = trialResults.filter((r) => r.reactionTimeMs < 0).length

    const handleSave = async () => {
      if (!sessionId) {
        alert("Missing Session ID!")
        return
      }
      setIsSaving(true)

      const result = await saveStimulusRuns(sessionId, trialResults.map((r) => ({
        trialIndex: r.trialIndex,
        direction: r.direction,
        cuedAt: r.cuedAt,
        respondedAt: r.respondedAt,
        reactionTimeMs: r.reactionTimeMs,
      })))

      if (result.success) {
        router.push(`/sessions/upload?sessionId=${sessionId}`)
      } else {
        alert(`Failed: ${result.error}`)
        setIsSaving(false)
      }
    }

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--color-bg-base)]">
        <div className="max-w-2xl w-full bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl">
          <h2 className="text-2xl font-display font-bold text-[var(--color-green-500)] mb-6 border-b border-[var(--color-bg-border)] pb-4">
            Protocol Complete
          </h2>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg border border-[var(--color-bg-border)] text-center">
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
                Mean RT
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--color-cyan-500)]">
                {avgRT > 0 ? `${avgRT.toFixed(0)}` : "—"}
                <span className="text-sm text-[var(--color-text-disabled)] ml-1">ms</span>
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg border border-[var(--color-bg-border)] text-center">
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
                Valid Trials
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--color-green-500)]">
                {validTrials.length}/{TOTAL_TRIALS}
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg border border-[var(--color-bg-border)] text-center">
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
                Missed
              </div>
              <div className={`text-2xl font-mono font-bold ${missedCount > 0 ? "text-[var(--color-red-500)]" : "text-[var(--color-green-500)]"}`}>
                {missedCount}
              </div>
            </div>
          </div>

          {/* Trial-by-trial breakdown */}
          <div className="space-y-2 mb-8">
            <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase">
              Trial Breakdown
            </h3>
            {trialResults.map((log) => (
              <div key={log.trialIndex} className="flex justify-between items-center bg-[var(--color-bg-elevated)] p-3 rounded-md text-sm font-mono border border-[var(--color-bg-border)]">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--color-text-disabled)] w-14">
                    Trial {log.trialIndex}
                  </span>
                  <span className={`font-bold ${
                    log.direction === "LEFT" ? "text-[var(--color-green-500)]"
                    : log.direction === "RIGHT" ? "text-[var(--color-red-500)]"
                    : "text-[var(--color-cyan-500)]"
                  }`}>
                    {log.direction}
                  </span>
                </div>
                <span className={`font-bold ${
                  log.reactionTimeMs < 0
                    ? "text-[var(--color-red-500)]"
                    : log.reactionTimeMs < 300
                    ? "text-[var(--color-green-500)]"
                    : log.reactionTimeMs < 500
                    ? "text-[var(--color-amber-500)]"
                    : "text-[var(--color-red-500)]"
                }`}>
                  {log.reactionTimeMs < 0 ? "MISSED" : `${log.reactionTimeMs.toFixed(1)} ms`}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? "Saving to Database..." : "Save & Proceed to IMU Upload →"}
          </button>
        </div>
      </main>
    )
  }

  // ─── UI: Ready (waiting for spacebar) ─────────────────────────────────────
  if (testState === "ready") {
    return (
      <main
        onClick={startTrialSequence}
        className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] cursor-pointer select-none"
      >
        <div className="text-center">
          <div className="text-[var(--color-text-disabled)] font-mono text-xl animate-pulse">
            <p>[ Trial {currentTrial + 1} of {TOTAL_TRIALS} ]</p>
          </div>
          <p className="mt-6 text-sm text-[var(--color-text-disabled)] opacity-50">
            Press <span className="text-[var(--color-text-primary)] font-bold">Spacebar</span> or Click to Fire
          </p>
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: TOTAL_TRIALS }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i < currentTrial
                    ? "bg-[var(--color-green-500)]"
                    : i === currentTrial
                    ? "bg-[var(--color-cyan-500)] animate-pulse scale-125"
                    : "bg-[var(--color-bg-border)]"
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    )
  }

  // ─── UI: Cued (color flash — PRESS NOW!) ──────────────────────────────────
  if (testState === "cued" && activeStimulus) {
    return (
      <main
        onClick={handleResponse}
        className={`min-h-screen flex flex-col items-center justify-center ${activeStimulus.color} cursor-pointer select-none`}
      >
        <div className="text-[var(--color-bg-base)] text-[15rem] font-bold leading-none">
          {activeStimulus.symbol}
        </div>
        <div className="mt-8 text-[var(--color-bg-base)]/70 text-lg font-bold uppercase tracking-widest animate-pulse">
          PRESS NOW
        </div>
      </main>
    )
  }

  // ─── UI: Inter-trial (brief feedback flash) ───────────────────────────────
  if (testState === "inter") {
    const lastResult = trialResults[trialResults.length - 1]
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="text-center">
          {lastResult && lastResult.reactionTimeMs > 0 ? (
            <>
              <div className="text-5xl font-mono font-bold text-[var(--color-cyan-500)]">
                {lastResult.reactionTimeMs.toFixed(0)}
                <span className="text-xl text-[var(--color-text-disabled)] ml-2">ms</span>
              </div>
              <div className="mt-2 text-[var(--color-text-disabled)] text-sm">
                {lastResult.reactionTimeMs < 300 ? "⚡ Excellent" : lastResult.reactionTimeMs < 500 ? "✓ Good" : "⚠ Slow"}
              </div>
            </>
          ) : (
            <div className="text-3xl font-bold text-[var(--color-red-500)]">
              MISSED
            </div>
          )}
        </div>
      </main>
    )
  }

  // ─── UI: Delay (pitch black) ──────────────────────────────────────────────
  return <main className="min-h-screen bg-[#000000]" />
}