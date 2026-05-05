import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

// Status badge colours
const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-[var(--color-amber-500)]/10 text-[var(--color-amber-500)] border-[var(--color-amber-500)]/30",
  processing: "bg-[var(--color-cyan-500)]/10  text-[var(--color-cyan-500)]  border-[var(--color-cyan-500)]/30",
  completed:  "bg-[var(--color-green-500)]/10 text-[var(--color-green-500)] border-[var(--color-green-500)]/30",
  failed:     "bg-[var(--color-red-500)]/10   text-[var(--color-red-500)]   border-[var(--color-red-500)]/30",
}

export default async function PlayerHome() {
  const authSession = await auth()
  if (!authSession || authSession.user.role !== "PLAYER") redirect("/login")

  const player = await prisma.player.findUnique({
    where: { userId: authSession.user.id },
    include: {
      coach: true,
      sessions: {
        orderBy: { createdAt: "desc" },
        include: { aclRsiResult: true, analysisResult: true },
      },
    },
  })

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-[var(--color-red-500)]">Profile Not Found</h1>
          <p className="text-[var(--color-text-secondary)]">Contact your coach or administrator.</p>
          <Link href="/api/auth/signout" className="text-[var(--color-cyan-500)] underline block">
            Sign Out
          </Link>
        </div>
      </div>
    )
  }

  const firstName = authSession.user.email.split("@")[0]
  const completedSessions = player.sessions.filter((s) => s.status === "completed")
  const pendingSession    = player.sessions.find((s) => s.status === "pending")

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="border-b border-[var(--color-bg-border)] pb-6">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
            Athlete Portal
          </p>
          <h1 className="text-3xl font-display font-bold">
            Welcome back,{" "}
            <span className="text-[var(--color-cyan-500)]">{firstName}</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-2">
            Assigned coach:{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {player.coach.email.split("@")[0]}
            </span>
            &nbsp;·&nbsp; Sport:{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {player.sport ?? "Unassigned"}
            </span>
            &nbsp;·&nbsp; Prescribed trials:{" "}
            <span className="font-mono font-bold text-[var(--color-amber-500)]">
              {player.trialCount}
            </span>
          </p>
        </div>

        {/* ── Primary CTA ──────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Start Assessment */}
          <Link
            href={`/sessions/questionnaire`}
            className="group relative flex flex-col justify-between p-7 rounded-2xl border-2 border-[var(--color-cyan-500)]/40 bg-[var(--color-bg-surface)] hover:border-[var(--color-cyan-500)] hover:bg-[var(--color-cyan-500)]/5 transition-all shadow-sm"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[var(--color-cyan-500)]/15 flex items-center justify-center mb-4 text-xl">
                ▶
              </div>
              <h2 className="text-xl font-bold font-display text-[var(--color-text-primary)] mb-2">
                Start Assessment
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Begin a new session: ACL-RSI questionnaire → setup walkthrough → Y-Drill stimulus protocol.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[var(--color-cyan-500)] text-sm font-bold uppercase tracking-wider">
              Begin
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
            {pendingSession && (
              <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--color-amber-500)]/15 text-[var(--color-amber-500)] border border-[var(--color-amber-500)]/30">
                Session in progress
              </span>
            )}
          </Link>

          {/* View Past Sessions */}
          <a
            href="#history"
            className="group flex flex-col justify-between p-7 rounded-2xl border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-bg-border)] hover:bg-[var(--color-bg-elevated)] transition-all shadow-sm"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-elevated)] flex items-center justify-center mb-4 text-xl">
                📋
              </div>
              <h2 className="text-xl font-bold font-display text-[var(--color-text-primary)] mb-2">
                View Past Sessions
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Review your assessment history, reaction time trends, and clinical readiness scores.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[var(--color-text-secondary)] text-sm font-bold uppercase tracking-wider">
              <span className="font-mono text-[var(--color-text-primary)]">
                {completedSessions.length}
              </span>
              completed session{completedSessions.length !== 1 ? "s" : ""}
              <span className="group-hover:translate-x-1 transition-transform">↓</span>
            </div>
          </a>
        </section>

        {/* ── Stats strip (only if sessions exist) ─────────────────── */}
        {completedSessions.length > 0 && (() => {
          const rtValues = completedSessions
            .map((s) => s.analysisResult?.rtMean)
            .filter((v): v is number => v !== null && v !== undefined)
          const avgRt = rtValues.length
            ? rtValues.reduce((a, b) => a + b, 0) / rtValues.length
            : null

          const lastAcl = completedSessions.find((s) => s.aclRsiResult?.compositeScore != null)
            ?.aclRsiResult?.compositeScore ?? null

          return (
            <section className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-xl p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">Sessions</div>
                <div className="text-2xl font-mono font-bold text-[var(--color-text-primary)]">{completedSessions.length}</div>
              </div>
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-xl p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">Avg RT</div>
                <div className="text-2xl font-mono font-bold text-[var(--color-cyan-500)]">
                  {avgRt !== null ? `${avgRt.toFixed(0)}ms` : "—"}
                </div>
              </div>
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-xl p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">Last ACL-RSI</div>
                <div className={`text-2xl font-mono font-bold ${
                  lastAcl === null ? "text-[var(--color-text-disabled)]"
                  : lastAcl >= 77  ? "text-[var(--color-green-500)]"
                  : lastAcl >= 56  ? "text-[var(--color-amber-500)]"
                  : "text-[var(--color-red-500)]"
                }`}>
                  {lastAcl !== null ? lastAcl : "—"}
                </div>
              </div>
            </section>
          )
        })()}

        {/* ── Assessment history ───────────────────────────────────── */}
        <section id="history">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-4">
            Assessment History
          </h2>

          {player.sessions.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-[var(--color-bg-border)] rounded-xl text-[var(--color-text-disabled)] text-sm bg-[var(--color-bg-surface)]">
              No sessions yet. Start your first assessment above.
            </div>
          ) : (
            <div className="space-y-3">
              {player.sessions.map((s) => {
                const rtMean  = s.analysisResult?.rtMean ?? null
                const dtc     = s.analysisResult?.dtcScore ?? null
                const aclScore = s.aclRsiResult?.compositeScore ?? null
                const isClickable = s.status === "completed"

                const card = (
                  <div className={`flex items-center justify-between p-4 rounded-xl border bg-[var(--color-bg-surface)] transition-all ${
                    isClickable
                      ? "border-[var(--color-bg-border)] hover:border-[var(--color-cyan-500)]/50 hover:bg-[var(--color-bg-elevated)] cursor-pointer"
                      : "border-[var(--color-bg-border)] opacity-70"
                  }`}>
                    {/* Left: date + condition */}
                    <div className="space-y-1">
                      <div className="font-bold text-[var(--color-text-primary)]">
                        {new Date(s.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status] ?? STATUS_STYLES.pending}`}>
                          {s.status.toUpperCase()}
                        </span>
                        {s.conditionType && (
                          <span className="text-[10px] text-[var(--color-text-disabled)] font-mono uppercase">
                            {s.conditionType}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: metrics */}
                    <div className="flex gap-6 text-right">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-disabled)]">Mean RT</div>
                        <div className="font-mono font-bold text-[var(--color-cyan-500)]">
                          {rtMean !== null ? `${rtMean.toFixed(0)}ms` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-disabled)]">DTC</div>
                        <div className={`font-mono font-bold ${dtc !== null ? (dtc > 15 ? "text-[var(--color-red-500)]" : dtc > 5 ? "text-[var(--color-amber-500)]" : "text-[var(--color-green-500)]") : "text-[var(--color-text-disabled)]"}`}>
                          {dtc !== null ? `${dtc.toFixed(1)}%` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-disabled)]">ACL-RSI</div>
                        <div className={`font-mono font-bold ${aclScore !== null ? (aclScore >= 77 ? "text-[var(--color-green-500)]" : aclScore >= 56 ? "text-[var(--color-amber-500)]" : "text-[var(--color-red-500)]") : "text-[var(--color-text-disabled)]"}`}>
                          {aclScore !== null ? aclScore : "—"}
                        </div>
                      </div>
                      {isClickable && (
                        <div className="flex items-center text-[var(--color-text-disabled)] hover:text-[var(--color-cyan-500)] transition-colors">
                          →
                        </div>
                      )}
                    </div>
                  </div>
                )

                return isClickable ? (
                  <Link key={s.id} href={`/sessions/${s.id}`}>{card}</Link>
                ) : (
                  <div key={s.id}>{card}</div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}