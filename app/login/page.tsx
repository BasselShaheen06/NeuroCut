import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"

export default function LoginPage() {
  
  async function handleLogin(formData: FormData) {
    "use server"
    
    try {
      // Explicitly extract the strings and define the redirect
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      })
    } catch (error) {
      if (error instanceof AuthError) {
        console.error("NextAuth failed:", error.type)
      }
      // CRITICAL: Next.js uses errors to handle redirects. 
      // If we catch the error, we MUST re-throw it so the redirect to /dashboard works!
      throw error 
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] text-[var(--color-text-primary)] p-4">
      <div className="w-full max-w-md bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-[var(--color-cyan-500)] mb-2">
            NeuroCut RTS
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Clinical Assessment System
          </p>
        </div>

        <form action={handleLogin} className="space-y-5">
          <div>
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
          </div>

          <div>
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
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity mt-4"
          >
            Access System
          </button>
        </form>

      </div>
    </main>
  )
}