import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { WaveformChart } from "@/components/WaveformChart"
import { DtcPairingPanel } from "@/components/DtcPairingPanel"
import FeatureImportanceChart from "@/components/FeatureImportanceChart"
import { CompositeGauge } from "@/components/CompositeGauge"
import { RTAnalysisChart } from "@/components/RTAnalysisChart"

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

  // ─── RT stats from browser-measured keypress data ───────────────────────────
  const validRuns = session.stimulusRuns.filter((r) => r.reactionTimeMs !== null && r.reactionTimeMs > 0)
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
  const readinessLevel = session.aclRsiResult?.readinessLevel ?? null

  // ─── ML prediction data ─────────────────────────────────────────────────────
  const mlScore = (session.analysisResult?.mlScore as number | null) ?? null
  const recommendation = (session.analysisResult?.recommendation as string | null) ?? null
  const featureImportances = (session.analysisResult?.featureImportances as Record<string, number> | null) ?? null
  const compositeScore = (session.analysisResult?.compositeScore as number | null) ?? null

  // ─── For DTC pairing: find available ST sessions for same player ────────────
  let availableStSessions: { id: string; createdAt: Date; rtMean: number | null }[] = []
  if (
    authSession.user.role === "COACH" &&
    session.conditionType === "DT" &&
    dtcScore === null
  ) {
    const stSessions = await prisma.session.findMany({
      where: {
        playerId: session.playerId,
        conditionType: "ST",
        status: "completed",
      },
      include: { analysisResult: { select: { rtMean: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    availableStSessions = stSessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      rtMean: s.analysisResult?.rtMean ?? null,
    }))
  }

  // ─── ACL-RSI subscale data ──────────────────────────────────────────────────
  const subscaleEmotions = session.aclRsiResult?.subscaleEmotions ?? null
  const subscaleConfidence = session.aclRsiResult?.subscaleConfidence ?? null
  const subscaleRisk = session.aclRsiResult?.subscaleRisk ?? null

  // ─── Composite breakdown for gauge ──────────────────────────────────────────
  const compositeBreakdown = []
  if (aclScore !== null) {
    compositeBreakdown.push({
      label: "ACL-RSI (Psychological)",
      score: aclScore,
      weight: mlScore !== null && dtcScore !== null ? 0.30 : mlScore !== null ? 0.35 : dtcScore !== null ? 0.35 : 0.45,
      color: aclScore >= 77 ? "var(--color-green-500)" : aclScore >= 56 ? "var(--color-amber-500)" : "var(--color-red-500)",
    })
  }
  if (avgReactionTimeMs > 0) {
    const rtScoreNorm = Math.max(0, Math.min(100, ((600 - avgReactionTimeMs) / 400) * 100))
    compositeBreakdown.push({
      label: "Reaction Time",
      score: rtScoreNorm,
      weight: mlScore !== null && dtcScore !== null ? 0.25 : mlScore !== null ? 0.30 : dtcScore !== null ? 0.30 : 0.55,
      color: avgReactionTimeMs < 300 ? "var(--color-green-500)" : avgReactionTimeMs < 500 ? "var(--color-amber-500)" : "var(--color-red-500)",
    })
  }
  if (dtcScore !== null) {
    const dtcScoreNorm = Math.max(0, Math.min(100, ((30 - Math.abs(dtcScore)) / 30) * 100))
    compositeBreakdown.push({
      label: "Dual-Task Cost",
      score: dtcScoreNorm,
      weight: mlScore !== null ? 0.20 : 0.35,
      color: dtcScore < 5 ? "var(--color-green-500)" : dtcScore < 15 ? "var(--color-amber-500)" : "var(--color-red-500)",
    })
  }
  if (mlScore !== null) {
    const mlScoreNorm = (1 - mlScore) * 100
    compositeBreakdown.push({
      label: "ML Gait Analysis",
      score: mlScoreNorm,
      weight: dtcScore !== null ? 0.25 : 0.35,
      color: mlScore < 0.3 ? "var(--color-green-500)" : mlScore < 0.65 ? "var(--color-amber-500)" : "var(--color-red-500)",
    })
  }

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
              <span className={`font-semibold ${
                session.conditionType === "DT"
                  ? "text-[var(--color-amber-500)]"
                  : "text-[var(--color-cyan-500)]"
              }`}>
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

        {/* ── Composite Score Gauge ─────────────────────────────────────── */}
        {compositeScore !== null && recommendation !== null && (
          <CompositeGauge
            score={compositeScore}
            recommendation={recommendation}
            breakdown={compositeBreakdown}
          />
        )}

        {/* ── Metrics grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                Pair with ST session below
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
            {readinessLevel && (
              <p className={`text-[10px] font-bold mt-1 ${
                readinessLevel === "READY" ? "text-[var(--color-green-500)]"
                : readinessLevel === "BORDERLINE" ? "text-[var(--color-amber-500)]"
                : "text-[var(--color-red-500)]"
              }`}>
                {readinessLevel}
              </p>
            )}
          </div>

          {/* Trials */}
          <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl border border-[var(--color-bg-border)] shadow-sm">
            <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-bold mb-2">
              Valid Trials
            </h3>
            <div className="text-3xl font-mono font-bold text-[var(--color-text-primary)]">
              {validRuns.length}
              <span className="text-base text-[var(--color-text-disabled)] ml-1">/{session.stimulusRuns.length}</span>
            </div>
          </div>
        </div>

        {/* ── RT Analysis Chart ──────────────────────────────────────────── */}
        {validRuns.length > 0 && (
          <RTAnalysisChart
            trials={session.stimulusRuns.map((r) => ({
              trialIndex: r.trialIndex,
              direction: r.direction,
              reactionTimeMs: r.reactionTimeMs,
            }))}
            meanRT={avgReactionTimeMs}
          />
        )}

        {/* ── ACL-RSI Subscales ────────────────────────────────────────────── */}
        {aclScore !== null && (
          <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-bg-border)] shadow-sm p-5">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">
              ACL-RSI Subscale Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Emotions", value: subscaleEmotions, items: "Q3, Q5, Q6, Q9" },
                { label: "Confidence", value: subscaleConfidence, items: "Q1, Q4, Q7, Q8, Q11" },
                { label: "Risk Appraisal", value: subscaleRisk, items: "Q2, Q10, Q12" },
              ].map(({ label, value, items }) => (
                <div key={label} className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
                    {label}
                  </div>
                  <div className={`text-2xl font-mono font-bold ${
                    value === null ? "text-[var(--color-text-disabled)]"
                    : value >= 77 ? "text-[var(--color-green-500)]"
                    : value >= 56 ? "text-[var(--color-amber-500)]"
                    : "text-[var(--color-red-500)]"
                  }`}>
                    {value !== null ? value.toFixed(0) : "—"}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-disabled)] mt-1">
                    {items}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-[var(--color-bg-elevated)] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        value === null ? ""
                        : value >= 77 ? "bg-[var(--color-green-500)]"
                        : value >= 56 ? "bg-[var(--color-amber-500)]"
                        : "bg-[var(--color-red-500)]"
                      }`}
                      style={{ width: `${value ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ML Prediction Results ──────────────────────────────────────── */}
        {mlScore !== null && (
          <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-bg-border)] shadow-sm p-5">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">
              ML Model Prediction
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-2">
                  Classification
                </div>
                <div className="text-2xl font-mono font-bold text-[var(--color-text-primary)]">
                  {mlScore > 0.5 ? "Dual-Task" : "Single-Task"}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {mlScore > 0.5 ? "DT gait pattern detected" : "Normal ST gait pattern"}
                </div>
              </div>
              <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-2">
                  Confidence
                </div>
                <div className="text-2xl font-mono font-bold text-[var(--color-cyan-500)]">
                  {(mlScore * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                  P(Dual-Task)
                </div>
              </div>
              <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-2">
                  Recommendation
                </div>
                <div className={`inline-block px-3 py-1.5 rounded-full text-sm font-bold border ${
                  recommendation === "CLEARED"
                    ? "bg-[var(--color-green-500)]/15 text-[var(--color-green-500)] border-[var(--color-green-500)]"
                    : recommendation === "CONDITIONAL"
                    ? "bg-[var(--color-amber-500)]/15 text-[var(--color-amber-500)] border-[var(--color-amber-500)]"
                    : "bg-[var(--color-red-500)]/15 text-[var(--color-red-500)] border-[var(--color-red-500)]"
                }`}>
                  {recommendation ?? "—"}
                </div>
              </div>
            </div>

            {/* Feature Importance Chart */}
            {featureImportances && Object.keys(featureImportances).length > 0 && (
              <FeatureImportanceChart importances={featureImportances} />
            )}
          </div>
        )}

        {/* ── DTC Pairing Panel (Coach only, DT sessions without DTC) ─────── */}
        {availableStSessions.length > 0 && (
          <DtcPairingPanel
            dtSessionId={params.id}
            stSessions={availableStSessions}
          />
        )}

        {/* ── IMU Waveform Chart ─────────────────────────────────────────── */}
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
                <span>No IMU waveform data available.</span>
                <span className="text-[10px]">
                  Upload IMU CSV to generate the acceleration waveform.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Trial-by-trial breakdown ───────────────────────────────────── */}
        <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-bg-border)] overflow-hidden shadow-sm">
          <div className="p-4 bg-[var(--color-bg-elevated)] border-b border-[var(--color-bg-border)] font-bold text-[var(--color-text-primary)] text-sm">
            Trial-by-Trial Breakdown
          </div>
          <div className="divide-y divide-[var(--color-bg-border)]">
            {session.stimulusRuns.map((run) => {
              const directionColor =
                run.direction === "LEFT"
                  ? "text-[var(--color-green-500)]"
                  : run.direction === "RIGHT"
                  ? "text-[var(--color-red-500)]"
                  : "text-[var(--color-cyan-500)]"

              const isMissed = run.reactionTimeMs !== null && run.reactionTimeMs < 0

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
                        Visual Cue
                      </span>
                      <span>{run.cuedAt ? new Date(run.cuedAt).toLocaleTimeString() : "—"}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase text-[var(--color-text-disabled)] tracking-wider">
                        Response
                      </span>
                      <span>
                        {isMissed ? (
                          <span className="text-[var(--color-red-500)]">MISSED</span>
                        ) : run.respondedAt ? (
                          new Date(run.respondedAt).toLocaleTimeString()
                        ) : "—"}
                      </span>
                    </div>
                  </div>

                  <div className={`font-mono font-bold w-24 text-right text-sm ${
                    isMissed
                      ? "text-[var(--color-red-500)]"
                      : run.reactionTimeMs && run.reactionTimeMs < 300
                      ? "text-[var(--color-green-500)]"
                      : run.reactionTimeMs && run.reactionTimeMs < 500
                      ? "text-[var(--color-cyan-500)]"
                      : "text-[var(--color-amber-500)]"
                  }`}>
                    {isMissed
                      ? "MISSED"
                      : run.reactionTimeMs
                      ? `${run.reactionTimeMs.toFixed(1)} ms`
                      : "—"}
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