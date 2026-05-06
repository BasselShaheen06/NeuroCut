"use client"

import { useState, useTransition } from "react"
import { linkSessionsForDtc } from "@/app/actions/linkSessionsForDtc"
import { useRouter } from "next/navigation"

type StSession = {
  id: string
  createdAt: Date
  rtMean: number | null
}

interface DtcPairingPanelProps {
  dtSessionId: string
  stSessions: StSession[]
}

export function DtcPairingPanel({ dtSessionId, stSessions }: DtcPairingPanelProps) {
  const router = useRouter()
  const [selectedStId, setSelectedStId] = useState<string>(stSessions[0]?.id ?? "")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; dtc?: number; error?: string } | null>(null)

  const handlePair = () => {
    if (!selectedStId || isPending) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append("stSessionId", selectedStId)
      formData.append("dtSessionId", dtSessionId)

      const res = await linkSessionsForDtc(formData)
      if (res.success) {
        setResult({ success: true, dtc: res.dtc })
        // Refresh the page to show updated DTC score
        setTimeout(() => router.refresh(), 1500)
      } else {
        setResult({ success: false, error: res.error })
      }
    })
  }

  if (result?.success) {
    return (
      <div className="bg-[var(--color-green-500)]/10 border border-[var(--color-green-500)] p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✓</span>
          <div>
            <h3 className="font-bold text-[var(--color-green-500)]">
              DTC Computed: {result.dtc?.toFixed(1)}%
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Refreshing page to show updated scores...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-amber-500)]/40 shadow-sm p-5">
      <h3 className="text-sm font-bold text-[var(--color-amber-500)] uppercase tracking-wider mb-1">
        Dual-Task Cost Pairing
      </h3>
      <p className="text-xs text-[var(--color-text-secondary)] mb-4">
        Select a completed Single-Task (ST) baseline session to compute DTC for this Dual-Task session.
      </p>

      {result?.error && (
        <div className="bg-[var(--color-red-500)]/10 border border-[var(--color-red-500)] text-[var(--color-red-500)] p-3 rounded-lg text-xs font-bold mb-4">
          {result.error}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {stSessions.map((st) => (
          <label
            key={st.id}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedStId === st.id
                ? "border-[var(--color-cyan-500)] bg-[var(--color-cyan-500)]/5"
                : "border-[var(--color-bg-border)] hover:border-[var(--color-bg-border)]"
              }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="stSession"
                value={st.id}
                checked={selectedStId === st.id}
                onChange={() => setSelectedStId(st.id)}
                className="accent-[var(--color-cyan-500)]"
              />
              <div>
                <div className="text-sm font-bold text-[var(--color-text-primary)]">
                  {new Date(st.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="text-[10px] font-mono text-[var(--color-text-disabled)]">
                  {st.id.slice(0, 12)}...
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-disabled)]">
                Mean RT
              </div>
              <div className="font-mono font-bold text-[var(--color-cyan-500)] text-sm">
                {st.rtMean !== null ? `${st.rtMean.toFixed(0)} ms` : "—"}
              </div>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handlePair}
        disabled={!selectedStId || isPending}
        className="w-full bg-[var(--color-amber-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-lg uppercase tracking-wider text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {isPending ? "Computing DTC..." : "Pair & Compute DTC"}
      </button>
    </div>
  )
}
