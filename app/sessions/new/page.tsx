"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
// Make sure you created this action file in the previous step!
import { saveVisualSession } from "@/app/actions/saveSession"

// Clinical cues optimized for distance visibility and dual-task processing
const STIMULI = [
  { direction: "LEFT", color: "bg-[var(--color-green-500)]", symbol: "←", label: "Cut Left" },
  { direction: "RIGHT", color: "bg-[var(--color-red-500)]", symbol: "→", label: "Cut Right" },
  { direction: "STOP", color: "bg-[var(--color-cyan-500)]", symbol: "■", label: "Decelerate/Stop" }
]

type TrialCue = {
  trialIndex: number
  direction: string
  absoluteTimestampMs: number
}

export default function ClinicalTriggerScreen() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const playerId = searchParams.get("playerId")

  const TOTAL_TRIALS = 5 
  
  // State Machine: setup -> ready (waiting for coach) -> delay (black screen) -> cued (flash) -> finished
  const [testState, setTestState] = useState<"setup" | "ready" | "delay" | "cued" | "finished">("setup")
  const [currentTrial, setCurrentTrial] = useState(0)
  const [cueLogs, setCueLogs] = useState<TrialCue[]>([])
  const [activeStimulus, setActiveStimulus] = useState<typeof STIMULI[0] | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Coach presses Spacebar or Clicks to initiate the random delay sequence
  const startTrialSequence = useCallback(() => {
    if (testState !== "ready") return
    
    setTestState("delay")
    
    // Unanticipated delay (1.5s to 3.5s) to prevent pre-activation of motor units
    const delayMs = Math.floor(Math.random() * 2000) + 1500

    timeoutRef.current = setTimeout(() => {
      const randomStimulus = STIMULI[Math.floor(Math.random() * STIMULI.length)]
      setActiveStimulus(randomStimulus)
      setTestState("cued")
      
      // Log the exact moment of visual stimulus presentation (UNIX timestamp)
      const newCue: TrialCue = {
        trialIndex: currentTrial + 1,
        direction: randomStimulus.direction,
        absoluteTimestampMs: Date.now() 
      }
      setCueLogs(prev => [...prev, newCue])

      // Cue stays on screen for 1.5 seconds, then resets for the next trial
      setTimeout(() => {
        if (currentTrial + 1 >= TOTAL_TRIALS) {
          setTestState("finished")
        } else {
          setCurrentTrial(prev => prev + 1)
          setTestState("ready")
          setActiveStimulus(null)
        }
      }, 1500)

    }, delayMs)
  }, [testState, currentTrial])

  // Listen for Coach's Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        startTrialSequence()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [startTrialSequence])

  // --- UI Rendering ---

if (testState === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--color-bg-base)]">
        <div className="max-w-2xl w-full bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl">
          <h1 className="text-2xl font-display font-bold text-[var(--color-cyan-500)] mb-2">
            Reactive Y-Drill Protocol
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
            Supervised Clinical Execution — Aligned with Chaaban et al. (2023).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg border border-[var(--color-bg-border)]">
              <h3 className="font-bold text-[var(--color-amber-500)] mb-2 text-sm uppercase">Physical Setup</h3>
              <ul className="text-sm space-y-2 text-[var(--color-text-secondary)] list-disc pl-4">
                <li>Place the start cone exactly <strong>3 meters</strong> from the screen.</li>
                <li>Place two target cones at a <strong>45° angle</strong> to the left and right.</li>
                <li>Secure the IMU sensor to the athlete's sacrum or dominant limb.</li>
              </ul>
            </div>

            <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg border border-[var(--color-bg-border)]">
              <h3 className="font-bold text-[var(--color-cyan-500)] mb-2 text-sm uppercase">Execution</h3>
              <ul className="text-sm space-y-2 text-[var(--color-text-secondary)] list-disc pl-4">
                <li>Athlete assumes athletic stance at the start cone.</li>
                <li>Coach clicks the screen to initiate the sequence.</li>
                <li>Athlete must initiate movement <strong>only after</strong> the visual cue appears.</li>
              </ul>
            </div>
          </div>

          <button 
            onClick={() => setTestState("ready")}
            className="w-full bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-4 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Acknowledge Setup & Begin Trial
          </button>
        </div>
      </main>
    )
  }

  if (testState === "finished") {
    const handleSave = async () => {
      if (!playerId) {
        alert("Missing Player ID!")
        return
      }
      setIsSaving(true)
      
      const result = await saveVisualSession(playerId, cueLogs)
      
      if (result.success) {
        // Route them to the IMU upload screen, passing the new Session ID
        router.push(`/sessions/upload?sessionId=${result.sessionId}`)
      } else {
        alert("Failed to save session to database.")
        setIsSaving(false)
      }
    }

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--color-bg-base)]">
        <div className="max-w-2xl w-full bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl">
          <h2 className="text-2xl font-display font-bold text-[var(--color-green-500)] mb-6 border-b border-[var(--color-bg-border)] pb-4">
            Visual Protocol Complete
          </h2>
          
          <div className="space-y-2 mb-8">
            <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase">Cue Synchronization Timestamps</h3>
            {cueLogs.map((log, i) => (
              <div key={i} className="flex justify-between items-center bg-[var(--color-bg-elevated)] p-3 rounded-md text-sm font-mono border border-[var(--color-bg-border)]">
                <span className="text-[var(--color-text-primary)]">Trial {log.trialIndex}: {log.direction}</span>
                <span className="text-[var(--color-amber-500)]">{log.absoluteTimestampMs}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? "Saving to Supabase..." : "Save Timestamps & Proceed to Data Upload"}
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (testState === "ready") {
    return (
      <main 
        onClick={startTrialSequence}
        className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] cursor-pointer"
      >
        <div className="text-[var(--color-text-disabled)] font-mono text-xl animate-pulse text-center">
          <p>[ Trial {currentTrial + 1} of {TOTAL_TRIALS} Ready ]</p>
          <p className="mt-4 text-sm opacity-50">Coach: Press Spacebar OR Click Screen to Fire</p>
        </div>
      </main>
    )
  }

  if (testState === "cued" && activeStimulus) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${activeStimulus.color}`}>
        <div className="text-[var(--color-bg-base)] text-[15rem] font-bold">
          {activeStimulus.symbol}
        </div>
      </main>
    )
  }

  // Delay state (Pitch Black)
  return <main className="min-h-screen bg-[#000000]" />
}