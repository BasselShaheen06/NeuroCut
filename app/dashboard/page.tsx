import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardPage() {
  // 1. Secure the page and get the current user session
  const session = await auth()
  
  if (!session || session.user.role !== "COACH") {
    redirect("/login")
  }

  // 2. Fetch all players assigned to this specific coach
  const players = await prisma.player.findMany({
    where: { coachId: session.user.id },
    include: { 
      user: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 3 // WIDENED: Grab the last 3 sessions for the history tracker
      }
    }
  })

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-body p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-end border-b border-[var(--color-bg-border)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-[var(--color-cyan-500)] tracking-wide">
              Coach Dashboard
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              Welcome back, Dr. {session.user.email?.split('@')[0]}
            </p>
          </div>
          <Link href="/api/auth/signout" className="text-sm font-bold text-[var(--color-text-disabled)] hover:text-[var(--color-red-500)] transition-colors uppercase tracking-wider">
            Sign Out
          </Link>
        </header>

        {/* Player Roster List */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest">
              Active Roster
            </h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => (
              <div key={player.id} className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-xl p-5 hover:border-[var(--color-cyan-500)] transition-all group shadow-sm">
                
                {/* Player Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-[var(--color-text-primary)]">
                      {player.user.email.split('@')[0]}
                    </h3>
                    <span className="text-xs text-[var(--color-cyan-500)] font-bold bg-[var(--color-cyan-500)]/10 px-2 py-1 rounded-md mt-2 inline-block">
                      {player.sport || "Unassigned"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-disabled)] block">
                      Target Trials
                    </span>
                    <span className="text-xl font-mono font-bold text-[var(--color-amber-500)]">
                      {player.trialCount}
                    </span>
                  </div>
                </div>

                {/* Live Status Tracker (Recent Sessions) */}
                <div className="mt-4 pt-4 border-t border-[var(--color-bg-border)] space-y-3">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-disabled)] font-bold">Recent Assessments</span>
                  
                  {player.sessions.length > 0 ? (
                    player.sessions.map(sess => (
                      <Link href={sess.status === 'pending' ? `/sessions/upload?sessionId=${sess.id}` : `/sessions/${sess.id}`} key={sess.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors">
                        <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                          {new Date(sess.createdAt).toLocaleDateString()}
                        </span>
                        
                        {/* Dynamic Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            sess.status === 'completed' ? 'bg-[var(--color-green-500)]' : 
                            sess.status === 'processing' ? 'bg-[var(--color-amber-500)] animate-ping' : 
                            'bg-[var(--color-text-disabled)]'
                          }`} />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
                            {sess.status}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-xs text-[var(--color-text-disabled)] italic">No sessions recorded.</div>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-4 mt-2 flex justify-end">
                  <Link 
                    href={`/sessions/new?playerId=${player.id}`}
                    className="text-xs font-bold text-[var(--color-bg-base)] bg-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-cyan-500)] transition-colors uppercase tracking-wider"
                  >
                    Start Protocol →
                  </Link>
                </div>

              </div>
            ))}

            {players.length === 0 && (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-[var(--color-bg-border)] rounded-xl text-[var(--color-text-secondary)]">
                <p className="font-bold mb-2">No athletes assigned.</p>
                <p className="text-sm">New players must register and select you as their coach.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  )
}