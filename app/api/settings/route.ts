import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/route-guards"
import { readSystemSettings, writeSystemSettings } from "@/lib/system-settings"

export async function GET() {
  const guard = await requireSession({ adminOnly: true })
  if ("error" in guard) {
    return guard.error
  }

  const [users, settings] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        full_name: true,
        username: true,
        role: true
      }
    }),
    readSystemSettings()
  ])

  return NextResponse.json({
    settings,
    users: users.map((user) => ({
      id: user.id,
      name: user.full_name,
      email: user.username,
      role: user.role,
      active: settings.userActivation[user.id] ?? true
    }))
  })
}

export async function PUT(request: Request) {
  const guard = await requireSession({ adminOnly: true })
  if ("error" in guard) {
    return guard.error
  }

  const body = (await request.json()) as { settings?: unknown }

  if (!body.settings) {
    return NextResponse.json({ error: "settings is required" }, { status: 400 })
  }

  const saved = await writeSystemSettings(body.settings as any)
  return NextResponse.json({ settings: saved })
}
