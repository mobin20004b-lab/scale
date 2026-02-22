import type { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type UserDashboardAccess = {
  operations: boolean
  reports: boolean
  scales: boolean
  settings: boolean
}

export const getDefaultAccessForRole = (role: UserRole): UserDashboardAccess => {
  if (role === "ADMIN") {
    return { operations: true, reports: true, scales: true, settings: true }
  }

  if (role === "VIEWER") {
    return { operations: false, reports: true, scales: false, settings: false }
  }

  return { operations: true, reports: true, scales: true, settings: false }
}

export const getUserDashboardAccess = async (userId: string, role: UserRole): Promise<UserDashboardAccess> => {
  const defaults = getDefaultAccessForRole(role)
  if (role === "ADMIN") {
    return defaults
  }

  const access = await prisma.userAccessControl.findUnique({ where: { userId } })
  if (!access) {
    return defaults
  }

  return {
    operations: access.canAccessOperations,
    reports: access.canAccessReports,
    scales: access.canAccessScales,
    settings: access.canAccessSettings,
  }
}

export const saveUserDashboardAccess = async (userId: string, access: UserDashboardAccess) => {
  return prisma.userAccessControl.upsert({
    where: { userId },
    create: {
      userId,
      canAccessOperations: access.operations,
      canAccessReports: access.reports,
      canAccessScales: access.scales,
      canAccessSettings: access.settings,
    },
    update: {
      canAccessOperations: access.operations,
      canAccessReports: access.reports,
      canAccessScales: access.scales,
      canAccessSettings: access.settings,
    },
  })
}
