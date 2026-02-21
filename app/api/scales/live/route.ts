import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchScaleLive } from "@/lib/scale-live"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ids = (searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)

    const scales = await fetchScaleLive(ids.length ? ids : undefined)

    return NextResponse.json({ scales })
  } catch (error) {
    console.error("[v0] Error fetching live scales:", error)
    return NextResponse.json({ error: "Failed to fetch live scales" }, { status: 500 })
  }
}
