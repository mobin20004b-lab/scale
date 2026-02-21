import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { setUserActive } from "@/lib/system-settings"
import { requireSession } from "@/lib/route-guards"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireSession({ adminOnly: true })
  if ("error" in guard) {
    return guard.error
  }

  const params = await context.params
  const body = (await request.json()) as { active?: boolean }

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active must be boolean" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 })
  }

  await setUserActive(params.id, body.active)

  return NextResponse.json({ success: true })
}
