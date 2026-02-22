import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { setUserActive } from "@/lib/system-settings"
import { requireSession } from "@/lib/route-guards"
import { saveUserDashboardAccess } from "@/lib/user-access"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireSession({ adminOnly: true })
  if ("error" in guard) {
    return guard.error
  }

  const params = await context.params
  const body = (await request.json()) as {
    active?: boolean
    access?: {
      operations?: boolean
      reports?: boolean
      scales?: boolean
      settings?: boolean
    }
  }

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } })
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 })
  }

  if (typeof body.active === "boolean") {
    await setUserActive(params.id, body.active)
  }

  if (body.access) {
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "admin access cannot be restricted" }, { status: 400 })
    }

    const access = body.access
    if (
      typeof access.operations !== "boolean" ||
      typeof access.reports !== "boolean" ||
      typeof access.scales !== "boolean" ||
      typeof access.settings !== "boolean"
    ) {
      return NextResponse.json({ error: "all access flags must be boolean" }, { status: 400 })
    }

    await saveUserDashboardAccess(params.id, access)
  }

  return NextResponse.json({ success: true })
}
