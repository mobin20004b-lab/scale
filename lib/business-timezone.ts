import { z } from "zod"

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function resolveBusinessTimeZone(timeZone: string | undefined) {
  const fallback = "Asia/Tehran"
  if (!timeZone) return fallback

  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return timeZone
  } catch {
    return fallback
  }
}

export const reportQuerySchema = z.object({
  startDate: z.string().regex(DATE_ONLY_REGEX).optional(),
  endDate: z.string().regex(DATE_ONLY_REGEX).optional(),
  productId: z.string().min(1).optional(),
  type: z.enum(["all", "in", "out"]).optional(),
})

export const activityQuerySchema = z.object({
  entity: z.enum(["all", "Product", "StockIn", "StockOut"]).optional(),
  user: z.string().min(1).optional(),
  from: z.string().regex(DATE_ONLY_REGEX).optional(),
  to: z.string().regex(DATE_ONLY_REGEX).optional(),
})

function parseOffsetToMs(offset: string) {
  if (offset === "GMT" || offset === "UTC") return 0

  const match = offset.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/)
  if (!match) return 0

  const sign = match[1] === "+" ? 1 : -1
  const hours = Number(match[2])
  const minutes = Number(match[3] ?? "0")
  return sign * ((hours * 60 + minutes) * 60 * 1000)
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })

  const offsetPart = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value

  return parseOffsetToMs(offsetPart ?? "GMT")
}

function zonedDatePartsToUtc(
  dateOnly: string,
  timeZone: string,
  endOfDay: boolean,
) {
  const [year, month, day] = dateOnly.split("-").map(Number)
  const hours = endOfDay ? 23 : 0
  const minutes = endOfDay ? 59 : 0
  const seconds = endOfDay ? 59 : 0
  const ms = endOfDay ? 999 : 0

  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, seconds, ms)
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone)

  return new Date(utcGuess - offset)
}

export function toBusinessDayStart(dateOnly: string, timeZone: string) {
  return zonedDatePartsToUtc(dateOnly, timeZone, false)
}

export function toBusinessDayEnd(dateOnly: string, timeZone: string) {
  return zonedDatePartsToUtc(dateOnly, timeZone, true)
}

export function formatDateOnlyInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    return "1970-01-01"
  }

  return `${year}-${month}-${day}`
}

export function getTimeZoneLabel(timeZone: string, date = new Date()) {
  const offsetMs = getTimeZoneOffsetMs(date, timeZone)
  const offsetMinutes = Math.round(offsetMs / (1000 * 60))
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const absOffset = Math.abs(offsetMinutes)
  const hours = String(Math.floor(absOffset / 60)).padStart(2, "0")
  const minutes = String(absOffset % 60).padStart(2, "0")

  return `${timeZone} (UTC${sign}${hours}:${minutes})`
}

export function getDefaultBusinessMonthRange(timeZone: string) {
  const nowDateOnly = formatDateOnlyInTimeZone(new Date(), timeZone)
  const [year, month] = nowDateOnly.split("-").map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  return {
    startDate,
    endDate,
    startBoundary: toBusinessDayStart(startDate, timeZone),
    endBoundary: toBusinessDayEnd(endDate, timeZone),
  }
}

