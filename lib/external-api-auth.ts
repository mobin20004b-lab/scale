import { NextResponse } from "next/server"
import { readSystemSettings } from "@/lib/system-settings"

const requestsByToken = new Map<string, number[]>()

const isRateLimited = (token: string, limitPerMinute: number) => {
  const now = Date.now()
  const windowStart = now - 60_000
  const current = requestsByToken.get(token) ?? []
  const filtered = current.filter((timestamp) => timestamp >= windowStart)

  if (filtered.length >= limitPerMinute) {
    requestsByToken.set(token, filtered)
    return true
  }

  filtered.push(now)
  requestsByToken.set(token, filtered)
  return false
}

const extractBearerToken = (request: Request) => {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) {
    return null
  }

  const token = header.slice(7).trim()
  return token || null
}

export const requireExternalApiAuth = async (request: Request) => {
  const providedToken = extractBearerToken(request)
  if (!providedToken) {
    return {
      error: NextResponse.json({ error: "Unauthorized - Bearer token required" }, { status: 401 })
    }
  }

  const settings = await readSystemSettings()
  if (!settings.api.enabled) {
    return {
      error: NextResponse.json({ error: "External API is disabled" }, { status: 403 })
    }
  }

  const configuredToken = settings.api.token?.trim()
  const envToken = process.env.API_SECRET_KEY?.trim()

  const acceptedTokens = [configuredToken, envToken].filter(
    (value): value is string => Boolean(value)
  )

  if (acceptedTokens.length === 0 || !acceptedTokens.includes(providedToken)) {
    return {
      error: NextResponse.json({ error: "Unauthorized - Invalid API token" }, { status: 401 })
    }
  }

  const rateLimit = Math.max(1, settings.api.rateLimitPerMinute || 1)
  if (isRateLimited(providedToken, rateLimit)) {
    return {
      error: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }
  }

  return { token: providedToken }
}
