import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import LoginClient from "./LoginClient"

async function loginAction(formData: FormData) {
  "use server"

  try {
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

export default function LoginPage() {
  return <LoginClient loginAction={loginAction} />
}