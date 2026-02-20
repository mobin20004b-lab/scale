import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

export type SystemSettings = {
  api: {
    enabled: boolean
    rateLimitPerMinute: number
    token: string
  }
  security: {
    requireStrongPassword: boolean
    forceRotation: boolean
    rotationDays: number
  }
  general: {
    systemLanguage: string
    timezone: string
    notificationsEnabled: boolean
    companyNote: string
  }
  userActivation: Record<string, boolean>
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "system-settings.json")

const createDefaultSettings = (): SystemSettings => ({
  api: {
    enabled: true,
    rateLimitPerMinute: 100,
    token: `sk_live_${crypto.randomUUID().replaceAll("-", "")}`
  },
  security: {
    requireStrongPassword: true,
    forceRotation: true,
    rotationDays: 90
  },
  general: {
    systemLanguage: "fa",
    timezone: "Asia/Tehran",
    notificationsEnabled: true,
    companyNote: "ثبت دقیق ورودی/خروجی برای کنترل موجودی الزامی است."
  },
  userActivation: {}
})

const normalizeSettings = (value: unknown): SystemSettings => {
  const fallback = createDefaultSettings()

  if (!value || typeof value !== "object") {
    return fallback
  }

  const input = value as Partial<SystemSettings>

  return {
    api: {
      enabled: input.api?.enabled ?? fallback.api.enabled,
      rateLimitPerMinute: input.api?.rateLimitPerMinute ?? fallback.api.rateLimitPerMinute,
      token: input.api?.token ?? fallback.api.token
    },
    security: {
      requireStrongPassword: input.security?.requireStrongPassword ?? fallback.security.requireStrongPassword,
      forceRotation: input.security?.forceRotation ?? fallback.security.forceRotation,
      rotationDays: input.security?.rotationDays ?? fallback.security.rotationDays
    },
    general: {
      systemLanguage: input.general?.systemLanguage ?? fallback.general.systemLanguage,
      timezone: input.general?.timezone ?? fallback.general.timezone,
      notificationsEnabled: input.general?.notificationsEnabled ?? fallback.general.notificationsEnabled,
      companyNote: input.general?.companyNote ?? fallback.general.companyNote
    },
    userActivation: input.userActivation ?? {}
  }
}

const ensureSettingsFile = async () => {
  await fs.mkdir(path.dirname(SETTINGS_FILE_PATH), { recursive: true })

  try {
    await fs.access(SETTINGS_FILE_PATH)
  } catch {
    const initial = createDefaultSettings()
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(initial, null, 2), "utf8")
  }
}

export const readSystemSettings = async (): Promise<SystemSettings> => {
  await ensureSettingsFile()
  const raw = await fs.readFile(SETTINGS_FILE_PATH, "utf8")
  const parsed = JSON.parse(raw) as unknown
  const normalized = normalizeSettings(parsed)

  if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(normalized, null, 2), "utf8")
  }

  return normalized
}

export const writeSystemSettings = async (settings: SystemSettings): Promise<SystemSettings> => {
  const normalized = normalizeSettings(settings)
  await ensureSettingsFile()
  await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(normalized, null, 2), "utf8")
  return normalized
}

export const updateSystemSettings = async (
  updater: (current: SystemSettings) => SystemSettings
): Promise<SystemSettings> => {
  const current = await readSystemSettings()
  const next = updater(current)
  return writeSystemSettings(next)
}

export const isUserActive = async (userId: string): Promise<boolean> => {
  const settings = await readSystemSettings()
  return settings.userActivation[userId] ?? true
}

export const setUserActive = async (userId: string, active: boolean): Promise<SystemSettings> => {
  return updateSystemSettings((current) => ({
    ...current,
    userActivation: {
      ...current.userActivation,
      [userId]: active
    }
  }))
}
