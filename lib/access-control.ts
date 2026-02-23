export type AppRole = "ADMIN" | "USER" | "VIEWER"

export type UserAccessPayload = {
  operations?: boolean
  reports?: boolean
  scales?: boolean
  settings?: boolean
}

const operationsPrefixes = [
  "/dashboard/stock-in",
  "/dashboard/stock-out",
  "/dashboard/movements",
  "/dashboard/warehouses",
  "/dashboard/products/new",
  "/dashboard/products/",
]

const reportsPrefixes = ["/dashboard/reports"]
const scalesPrefixes = ["/dashboard/scales"]
const settingsPrefixes = ["/dashboard/settings"]

const pathMatches = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

const fallbackAccessByRole = (role?: string | null): Required<UserAccessPayload> => {
  if (role === "ADMIN") return { operations: true, reports: true, scales: true, settings: true }
  if (role === "VIEWER") return { operations: false, reports: true, scales: false, settings: false }
  return { operations: true, reports: true, scales: true, settings: false }
}

export const hasDashboardAccess = (
  pathname: string,
  role?: string | null,
  access?: UserAccessPayload | null
) => {
  if (!pathname.startsWith("/dashboard")) return true
  if (pathname === "/dashboard" || pathname === "/dashboard/forbidden") return true

  if (role === "ADMIN") return true

  const resolved = { ...fallbackAccessByRole(role), ...(access ?? {}) }

  if (pathMatches(pathname, settingsPrefixes)) {
    return Boolean(resolved.settings)
  }

  if (pathMatches(pathname, scalesPrefixes)) {
    return Boolean(resolved.scales)
  }

  if (pathMatches(pathname, reportsPrefixes)) {
    return Boolean(resolved.reports)
  }

  if (pathMatches(pathname, operationsPrefixes)) {
    return Boolean(resolved.operations)
  }

  return true
}
