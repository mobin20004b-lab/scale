import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

type GuardOptions = {
  adminOnly?: boolean
}

export const requireSession = async (options: GuardOptions = {}) => {
  const session = await auth()

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  if (options.adminOnly && (session.user as { role?: string }).role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return { session }
}

