"use client"

import { motion } from "framer-motion"

interface LoginClientProps {
  loginAction: (formData: FormData) => Promise<void>
}

export default function LoginClient({ loginAction }: LoginClientProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] text-[var(--color-text-primary)] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[var(--color-cyan-500)]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[var(--color-cyan-500)]/3 blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-md bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl relative z-10"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Logo */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-cyan-500)]/10 border border-[var(--color-cyan-500)]/30 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2L4 10v12l12 8 12-8V10L16 2z"
                stroke="var(--color-cyan-500)"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="16" cy="16" r="4" fill="var(--color-cyan-500)" opacity="0.6" />
              <path d="M16 8v4M16 20v4M10 14h4M18 14h4" stroke="var(--color-cyan-500)" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="text-3xl font-display font-bold text-[var(--color-cyan-500)] mb-2">
            NeuroCut RTS
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Clinical Assessment System
          </p>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-disabled)] mt-2">
            ACL Return-to-Play Decision Support
          </p>
        </motion.div>

        <form action={loginAction} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              defaultValue="coach@clinic.com"
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-md p-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-cyan-500)] transition-colors"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              defaultValue="password123"
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-md p-3 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-cyan-500)] transition-colors"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              type="submit"
              className="w-full bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity mt-4 active:scale-[0.98]"
            >
              Access System
            </button>
          </motion.div>

          <motion.div
            className="text-center text-[10px] text-[var(--color-text-disabled)] space-y-1 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p>Coach: coach@clinic.com · password123</p>
            <p>Player: player@team.com · password123</p>
          </motion.div>
        </form>
      </motion.div>
    </main>
  )
}
