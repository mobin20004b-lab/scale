import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { hasDashboardAccess } from "@/lib/access-control"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })

  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    loginUrl.searchParams.set("reason", "session")
    return NextResponse.redirect(loginUrl)
  }

  if (!hasDashboardAccess(request.nextUrl.pathname, token.role as string | undefined, token.access as Record<string, boolean> | undefined)) {
    const forbiddenUrl = new URL("/dashboard/forbidden", request.url)
    forbiddenUrl.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(forbiddenUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
