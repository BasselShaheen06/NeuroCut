import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const coachRoutes = ["/dashboard", "/athletes", "/sessions", "/reports"]
const playerRoutes = ["/player"]

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role

  const isCoachRoute = coachRoutes.some(route => nextUrl.pathname.startsWith(route))
  const isPlayerRoute = playerRoutes.some(route => nextUrl.pathname.startsWith(route))
  const isAuthRoute = nextUrl.pathname.startsWith("/login")

  // Redirect authenticated users away from login
  if (isAuthRoute && isLoggedIn) {
    if (role === "COACH") return NextResponse.redirect(new URL("/dashboard", nextUrl))
    if (role === "PLAYER") return NextResponse.redirect(new URL("/player", nextUrl))
  }

  // Protect Coach routes
  if (isCoachRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl))
    if (role !== "COACH") return NextResponse.redirect(new URL("/player", nextUrl))
  }

  // Protect Player routes
  if (isPlayerRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl))
    if (role !== "PLAYER") return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

// Specify paths where middleware should run
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}