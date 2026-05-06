import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function SessionPreviewPage({
  searchParams,
}: {
  searchParams: { sessionId?: string }
}) {
  const authSession = await auth()
  if (!authSession || authSession.user.role !== "PLAYER") redirect("/login")

  const sessionId = searchParams.sessionId
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-[var(--color-red-500)]">Missing Session</h1>
          <p className="text-[var(--color-text-secondary)]">No session ID was provided.</p>
          <Link href="/player" className="text-[var(--color-cyan-500)] underline block">
            Back to Player Portal
          </Link>
        </div>
      </div>
    )
  }

  const player = await prisma.player.findUnique({
    where: { userId: authSession.user.id },
    select: {
      id: true,
      trialCount: true,
      coach: { select: { email: true } },
    },
  })

  if (!player) redirect("/player")

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { aclRsiResult: true },
  })

  if (!session || session.playerId !== player.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-[var(--color-red-500)]">Session Not Found</h1>
          <p className="text-[var(--color-text-secondary)]">This session does not belong to your account.</p>
          <Link href="/player" className="text-[var(--color-cyan-500)] underline block">
            Back to Player Portal
          </Link>
        </div>
      </div>
    )
  }

  const conditionLabel = session.conditionType === "DT" ? "Dual-Task" : "Single-Task"
  const aclScore = session.aclRsiResult?.compositeScore ?? null
  const readinessLevel = session.aclRsiResult?.readinessLevel ?? null

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-text-disabled)] font-bold">
              Next: Experiment
            </p>
            <h1 className="text-3xl font-display font-bold text-[var(--color-cyan-500)]">
              Session Ready
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              Your questionnaire is saved. Start the reaction-time experiment when ready.
            </p>
          </div>
          <Link
            href="/player"
            className="text-[var(--color-text-disabled)] hover:text-[var(--color-text-primary)] transition-colors font-bold text-xs uppercase tracking-wider"
          >
            ← Back
          </Link>
        </div>

        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold">
                Session ID
              </div>
              <div className="font-mono text-[var(--color-text-primary)] text-sm">
                {session.id}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold">
                Condition
              </div>
              <div className={`font-bold ${session.conditionType === "DT" ? "text-[var(--color-amber-500)]" : "text-[var(--color-cyan-500)]"}`}>
                {conditionLabel}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
                Coach
              </div>
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                {player.coach?.email.split("@")[0]}
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
                Prescribed Trials
              </div>
              <div className="text-sm font-mono font-bold text-[var(--color-amber-500)]">
                {player.trialCount}
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
                ACL-RSI
              </div>
              <div className={`text-sm font-mono font-bold ${
                aclScore === null
                  ? "text-[var(--color-text-disabled)]"
                  : aclScore >= 77
                  ? "text-[var(--color-green-500)]"
                  : aclScore >= 56
                  ? "text-[var(--color-amber-500)]"
                  : "text-[var(--color-red-500)]"
              }`}>
                {aclScore !== null ? aclScore.toFixed(1) : "—"}
              </div>
              {readinessLevel && (
                <div className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                  {readinessLevel}
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-[var(--color-text-secondary)]">
            Created: {new Date(session.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)] font-bold mb-3">
            Next Steps
          </h2>
          <ol className="text-sm text-[var(--color-text-secondary)] space-y-2 list-decimal pl-5">
            <li>Complete the reaction-time experiment.</li>
            <li>Upload IMU data (or inject feature-ready CSV).</li>
            <li>Run the model and review results.</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={`/sessions/new?sessionId=${session.id}`}
            className="flex-1 text-center bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Start Experiment →
          </Link>
          <Link
            href="/player"
            className="flex-1 text-center border border-[var(--color-bg-border)] text-[var(--color-text-secondary)] font-bold py-3 rounded-lg uppercase tracking-wider hover:text-[var(--color-text-primary)] transition-colors"
          >
            Back to Portal
          </Link>
        </div>

      </div>
    </main>
  )
}
