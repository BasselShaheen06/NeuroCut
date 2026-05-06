import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isAuthRoute = nextUrl.pathname.startsWith("/login")

  // Redirect authenticated users away from login
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // Protect ALL routes except login and api
  if (!isAuthRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
})

// Specify paths where middleware should run
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}