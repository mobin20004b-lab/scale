import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScaleHealthSnapshot } from "@/lib/scale-health"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scales = await prisma.scale.findMany({
      select: {
        id: true,
        name: true,
        lastHeartbeatAt: true,
        lastStableWeight: true,
        unstableFlag: true,
        spikeFlag: true,
        archivedAt: true,
      },
    })

    const items = scales.map((scale) => {
      const snapshot = getScaleHealthSnapshot(scale.lastHeartbeatAt, {
        archivedAt: scale.archivedAt,
      })
      return {
        ...scale,
        health: snapshot.health,
        lastReadingAgeMs: snapshot.lastReadingAgeMs,
      }
    })

    const summary = items.reduce(
      (acc, item) => {
        acc[item.health] += 1
        return acc
      },
      { ONLINE: 0, DEGRADED: 0, OFFLINE: 0, ARCHIVED: 0 }
    )

    return NextResponse.json({ summary, scales: items })
  } catch (error) {
    console.error("[v0] Error fetching scale health summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch scale health summary" },
      { status: 500 }
    )
  }
}
