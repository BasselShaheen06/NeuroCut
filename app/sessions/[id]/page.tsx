import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { WaveformChart } from "@/components/WaveformChart"

// ─── Types mirroring what Python writes to waveformJson ───────────────────────
type WaveformPoint = { t: number; g: number }

export default async function SessionResultsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { trial?: string }
}) {
  const authSession = await auth()
  if (!authSession) redirect("/login")

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      player: { include: { user: true } },
      stimulusRuns: { orderBy: { trialIndex: "asc" } },
      aclRsiResult: true,
      analysisResult: true,
    },
  })

  if (!session) {
    return (
      <div className="p-8 text-center text-[var(--color-red-500)]">
        Session not found.
      </div>
    )
  }

  // ─── Client-side trial selector (passed via searchParam) ────────────────────
  const activeTrial = searchParams.trial
    ? parseInt(searchParams.trial, 10)
    : undefined

  // ─── RT stats (recalculated from DB for accuracy) ───────────────────────────
  const validRuns = session.stimulusRuns.filter((r) => r.reactionTimeMs !== null)
  let avgReactionTimeMs = 0
  let rtCV = 0

  if (validRuns.length > 0) {
    const total = validRuns.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0)
    avgReactionTimeMs = total / validRuns.length
    const variance = validRuns.reduce((acc, r) => {
      const d = (r.reactionTimeMs ?? 0) - avgReactionTimeMs
      return acc + d * d
    }, 0) / validRuns.length
    rtCV = (Math.sqrt(variance) / avgReactionTimeMs) * 100
  }

  const dtcScore = (session.analysisResult?.dtcScore as number | null) ?? null
  const waveform = (session.analysisResult?.waveformJson as unknown as WaveformPoint[] | null) ?? []
  const aclScore = (session.aclRsiResult?.compositeScore as number | null) ?? null
  const conditionLabel = session.conditionType === "ST" ? "Single-Task" : session.conditionType === "DT" ? "Dual-Task" : "Unspecified"

  return (
    <main className="min-h-screen p-6 md:p-10 bg-[var(--color-bg-base)]">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-end border-b border-[var(--color-bg-border)] pb-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-[var(--color-cyan-500)]">
              Session Telemetry
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1 text-sm">
              Athlete:{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {session.player.user.email.split("@")[0]}
              </span>{" "}
              &nbsp;·&nbsp; Condition:{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {conditionLabel}
              </span>{" "}
              &nbsp;·&nbsp; {new Date(session.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Link
            href={authSession.user.role === "COACH" ? "/dashboard" : "/player"}
            className="text-[var(--color-text-disabled)] hover:text-[var(--color-text-primary)] transition-colors font-bold text-xs uppercase tracking-wider"
          >
            ← Back to Portal
          </Link>
        </div>

        {/* ── Processing banner ──────────────────────────────────────────── */}
        {session.status === "processing" && (
          <div className="bg-[var(--color-amber-500)]/10 border border-[var(--color-amber-500)] text-[var(--color-amber-500)] p-4 rounded-xl text-center font-bold animate-pulse">
            Python engine is crunching the IMU data. Refresh in a few seconds.
          </div>
        )}

        {/* ── Metrics grid ───────────────────────────────────────────────── */}
        {session.status === "completed" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Mean RT */}
            <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl border border-[var(--color-bg-border)] shadow-sm">
              <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-bold mb-2">
                Mean RT
              </h3>
              <div className="text-3xl font-mono font-bold text-[var(--color-cyan-500)]">
                {avgReactionTimeMs > 0 ? avgReactionTimeMs.toFixed(0) : "---"}
                <span className="text-base text-[var(--color-text-disabled)] ml-1">ms</span>
              </div>
            </div>

            {/* RT Variability */}
            <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl border border-[var(--color-bg-border)] shadow-sm">
              <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-bold mb-2">
                RT Variability (CV)
              </h3>
              <div className="text-3xl font-mono font-bold text-[var(--color-amber-500)]">
                {rtCV.toFixed(1)}
                <span className="text-base text-[var(--color-text-disabled)] ml-1">%</span>
              </div>
            </div>

            {/* DTC */}
            <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl border border-[var(--color-bg-border)] shadow-sm">
              <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-bold mb-2">
                Dual-Task Cost
              </h3>
              <div
                className={`text-3xl font-mono font-bold ${
                  dtcScore === null
                    ? "text-[var(--color-text-disabled)]"
                    : dtcScore > 15
                    ? "text-[var(--color-red-500)]"
                    : dtcScore > 5
                    ? "text-[var(--color-amber-500)]"
                    : "text-[var(--color-green-500)]"
                }`}
              >
                {dtcScore !== null ? `${dtcScore.toFixed(1)}%` : "—"}
              </div>
              {dtcScore === null && session.conditionType === "DT" && (
                <p className="text-[10px] text-[var(--color-text-disabled)] mt-1 leading-snug">
                  Pair with an ST session to calculate
                </p>
              )}
            </div>

            {/* ACL-RSI */}
            <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl border border-[var(--color-bg-border)] shadow-sm">
              <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-bold mb-2">
                ACL-RSI
              </h3>
              <div
                className={`text-3xl font-mono font-bold ${
                  aclScore === null
                    ? "text-[var(--color-text-disabled)]"
                    : aclScore >= 77
                    ? "text-[var(--color-green-500)]"
                    : aclScore >= 56
                    ? "text-[var(--color-amber-500)]"
                    : "text-[var(--color-red-500)]"
                }`}
              >
                {aclScore !== null ? `${aclScore}` : "—"}
                {aclScore !== null && (
                  <span className="text-base text-[var(--color-text-disabled)] ml-1">/100</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── IMU Waveform Chart ─────────────────────────────────────────── */}
        {session.status === "completed" && (
          <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-bg-border)] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-[var(--color-bg-elevated)] border-b border-[var(--color-bg-border)]">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                IMU Acceleration Waveform
              </span>
              {/* Trial selector tabs */}
              <div className="flex gap-1">
                <Link
                  href={`/sessions/${params.id}`}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                    !activeTrial
                      ? "bg-[var(--color-cyan-500)]/20 text-[var(--color-cyan-500)]"
                      : "text-[var(--color-text-disabled)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  All
                </Link>
                {session.stimulusRuns.map((r) => (
                  <Link
                    key={r.id}
                    href={`/sessions/${params.id}?trial=${r.trialIndex}`}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                      activeTrial === r.trialIndex
                        ? "bg-[var(--color-cyan-500)]/20 text-[var(--color-cyan-500)]"
                        : "text-[var(--color-text-disabled)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    T{r.trialIndex}
                  </Link>
                ))}
              </div>
            </div>
            <div className="p-4">
              {waveform.length > 0 ? (
                <>
                  <WaveformChart
                    waveform={waveform}
                    cues={session.stimulusRuns.map((r) => ({
                      trialIndex:    r.trialIndex,
                      direction:     r.direction,
                      cuedAt:        r.cuedAt,
                      respondedAt:   r.respondedAt,
                      reactionTimeMs: r.reactionTimeMs,
                    }))}
                    activeTrial={activeTrial}
                  />
                  <p className="text-[10px] text-[var(--color-text-disabled)] mt-2 text-right font-mono">
                    Dashed lines = visual cue &nbsp;|&nbsp; Solid lines = motor onset (Python detected)
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-[var(--color-text-disabled)] text-sm font-mono flex-col gap-2">
                  <span>Waveform not yet stored.</span>
                  <span className="text-[10px]">
                    Re-upload the IMU CSV to regenerate it.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Trial-by-trial breakdown ───────────────────────────────────── */}
        <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-bg-border)] overflow-hidden shadow-sm">
          <div className="p-4 bg-[var(--color-bg-elevated)] border-b border-[var(--color-bg-border)] font-bold text-[var(--color-text-primary)] text-sm">
            Hardware Synchronisation Breakdown
          </div>
          <div className="divide-y divide-[var(--color-bg-border)]">
            {session.stimulusRuns.map((run) => {
              const directionColor =
                run.direction === "LEFT"
                  ? "text-[var(--color-green-500)]"
                  : run.direction === "RIGHT"
                  ? "text-[var(--color-red-500)]"
                  : "text-[var(--color-cyan-500)]"

              return (
                <div
                  key={run.id}
                  className="p-4 flex justify-between items-center hover:bg-[var(--color-bg-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[var(--color-text-disabled)] text-sm w-14">
                      Trial {run.trialIndex}
                    </span>
                    <span className={`font-bold text-sm w-14 ${directionColor}`}>
                      {run.direction}
                    </span>
                  </div>

                  <div className="flex gap-8 text-xs font-mono text-[var(--color-text-secondary)]">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase text-[var(--color-text-disabled)] tracking-wider">
                        Visual Cue (Unix)
                      </span>
                      <span>{run.cuedAt ? run.cuedAt.toFixed(0) : "—"}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase text-[var(--color-text-disabled)] tracking-wider">
                        Motor Onset (Unix)
                      </span>
                      <span>{run.respondedAt ? run.respondedAt.toFixed(0) : "—"}</span>
                    </div>
                  </div>

                  <div className="font-mono font-bold text-[var(--color-cyan-500)] w-24 text-right text-sm">
                    {run.reactionTimeMs ? `${run.reactionTimeMs.toFixed(0)} ms` : "—"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </main>
  )
}