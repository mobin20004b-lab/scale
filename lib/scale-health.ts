import { DateInput } from "@/lib/date-time"

export type ScaleHealth = "ONLINE" | "STALE" | "OFFLINE"

export const SCALE_STALE_THRESHOLD_MS = 30 * 1000
export const SCALE_OFFLINE_THRESHOLD_MS = 5 * 60 * 1000

const HEARTBEAT_TO_STALE_MULTIPLIER = 3
const HEARTBEAT_TO_OFFLINE_MULTIPLIER = 10

interface ScaleHealthOptions {
  now?: number
  heartbeatIntervalSec?: number | null
  staleThresholdMs?: number
  offlineThresholdMs?: number
}

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

function resolveThresholds(options: ScaleHealthOptions = {}) {
  const heartbeatMs =
    typeof options.heartbeatIntervalSec === "number" &&
    Number.isFinite(options.heartbeatIntervalSec) &&
    options.heartbeatIntervalSec > 0
      ? options.heartbeatIntervalSec * 1000
      : null

  const staleThresholdMs = Math.max(
    options.staleThresholdMs ?? SCALE_STALE_THRESHOLD_MS,
    heartbeatMs ? heartbeatMs * HEARTBEAT_TO_STALE_MULTIPLIER : 0
  )

  const offlineThresholdMs = Math.max(
    options.offlineThresholdMs ?? SCALE_OFFLINE_THRESHOLD_MS,
    heartbeatMs ? heartbeatMs * HEARTBEAT_TO_OFFLINE_MULTIPLIER : 0,
    staleThresholdMs + 1
  )

  return { staleThresholdMs, offlineThresholdMs }
}

export function getScaleHealthSnapshot(
  lastWeightAt: DateInput,
  options: ScaleHealthOptions = {}
) {
  const now = options.now ?? Date.now()
  const timestamp = normalizeTimestamp(lastWeightAt)
  if (!timestamp) {
    return {
      health: "OFFLINE" as const,
      lastReadingAgeMs: null,
    }
  }

  const ageMs = Math.max(0, now - timestamp)
  const { staleThresholdMs, offlineThresholdMs } = resolveThresholds(options)

  if (ageMs <= staleThresholdMs) {
    return {
      health: "ONLINE" as const,
      lastReadingAgeMs: ageMs,
    }
  }

  if (ageMs <= offlineThresholdMs) {
    return {
      health: "STALE" as const,
      lastReadingAgeMs: ageMs,
    }
  }

  return {
    health: "OFFLINE" as const,
    lastReadingAgeMs: ageMs,
  }
}
