import { DateInput } from "@/lib/date-time"

export type ScaleHealth = "ONLINE" | "DEGRADED" | "OFFLINE" | "ARCHIVED"

export const SCALE_DEGRADED_THRESHOLD_MS = 30 * 1000
export const SCALE_OFFLINE_THRESHOLD_MS = 5 * 60 * 1000

function normalizeTimestamp(value: DateInput) {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.getTime()
}

export function getScaleHealthSnapshot(
  lastHeartbeatAt: DateInput,
  options?: {
    archivedAt?: DateInput
    now?: number
  }
) {
  const now = options?.now ?? Date.now()
  const archivedAt = normalizeTimestamp(options?.archivedAt)

  if (archivedAt) {
    return {
      health: "ARCHIVED" as const,
      lastReadingAgeMs: null,
    }
  }

  const timestamp = normalizeTimestamp(lastHeartbeatAt)
  if (!timestamp) {
    return {
      health: "OFFLINE" as const,
      lastReadingAgeMs: null,
    }
  }

  const ageMs = Math.max(0, now - timestamp)

  if (ageMs <= SCALE_DEGRADED_THRESHOLD_MS) {
    return {
      health: "ONLINE" as const,
      lastReadingAgeMs: ageMs,
    }
  }

  if (ageMs <= SCALE_OFFLINE_THRESHOLD_MS) {
    return {
      health: "DEGRADED" as const,
      lastReadingAgeMs: ageMs,
    }
  }

  return {
    health: "OFFLINE" as const,
    lastReadingAgeMs: ageMs,
  }
}
