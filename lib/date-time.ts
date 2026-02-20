export type DateInput = Date | string | number | null | undefined

const PERSIAN_LOCALE = "fa-IR-u-ca-persian"

function normalizeDate(value: DateInput) {
  if (value === null || value === undefined) return undefined

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  return date
}

function getDateTimeFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(PERSIAN_LOCALE, options)
}

export function formatPersianDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
) {
  const date = normalizeDate(value)
  if (!date) return "-"

  return getDateTimeFormatter(options).format(date)
}

export function formatPersianDateTime(value: DateInput) {
  return formatPersianDate(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatPersianRelativeTime(value: DateInput, now = new Date()) {
  const date = normalizeDate(value)
  if (!date) return "-"

  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diffSeconds)

  const rtf = new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" })

  if (abs < 60) return rtf.format(diffSeconds, "second")

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute")

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour")

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day")

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month")

  const diffYears = Math.round(diffMonths / 12)
  return rtf.format(diffYears, "year")
}

export function getLocalTimeZoneLabel(value: DateInput = new Date()) {
  const date = normalizeDate(value)
  if (!date) return "-"

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const absOffset = Math.abs(offsetMinutes)
  const hours = String(Math.floor(absOffset / 60)).padStart(2, "0")
  const minutes = String(absOffset % 60).padStart(2, "0")

  return `${timeZone} (UTC${sign}${hours}:${minutes})`
}

export function toIsoString(value: DateInput) {
  const date = normalizeDate(value)
  if (!date) return undefined

  return date.toISOString()
}

