import Link from "next/link"
import { auth } from "@/lib/auth"
import { ThemeToggle } from "@/components/ThemeToggle"

export async function Navbar() {
  const session = await auth()
  if (!session) return null // Don't show navbar on login screen

  return (
    <nav className="w-full border-b border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/login" className="text-xl font-display font-bold text-[var(--color-cyan-500)] hover:opacity-80 transition-opacity">
          NeuroCut
        </Link>
        
        {/* Navigation Tabs — accessible to all users */}
        <div className="flex gap-4 text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          <Link href="/dashboard" className="hover:text-[var(--color-text-primary)] transition-colors">Dashboard</Link>
          <Link href="/player" className="hover:text-[var(--color-text-primary)] transition-colors">My Portal</Link>
          <Link href="/player#history" className="hover:text-[var(--color-text-primary)] transition-colors">Assessment History</Link>
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