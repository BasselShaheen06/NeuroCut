import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const session = await auth()
  
  // If not logged in, go to login
  if (!session) {
    redirect("/login")
  }

  // Route based on role
  if (session.user.role === "COACH") {
    redirect("/dashboard")
  } else if (session.user.role === "PLAYER") {
    redirect("/player")
  }

  // Fallback
  redirect("/login")
}