import Link from "next/link"
import { auth } from "@/lib/auth"
import { ThemeToggle } from "@/components/ThemeToggle"

export async function Navbar() {
  const session = await auth()
  if (!session) return null // Don't show navbar on login screen

  const isCoach = session.user.role === "COACH"

  return (
    <nav className="w-full border-b border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-display font-bold text-[var(--color-cyan-500)]">
          NeuroCut
        </h1>
        
        {/* Dynamic Tabs based on Role */}
        <div className="flex gap-4 text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isCoach ? (
            <>
              <Link href="/dashboard" className="hover:text-[var(--color-text-primary)] transition-colors">Active Roster</Link>
              <span className="cursor-not-allowed opacity-50">Clinic Settings</span>
            </>
          ) : (
            <>
              <Link href="/player" className="hover:text-[var(--color-text-primary)] transition-colors">My Portal</Link>
              <span className="cursor-not-allowed opacity-50">Assessment History</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Link href="/api/auth/signout" className="text-sm font-bold text-[var(--color-red-500)] hover:underline">
          Sign Out
        </Link>
      </div>
    </nav>
  )
}