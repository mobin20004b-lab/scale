import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")

    const whereClause = idsParam
      ? {
          id: {
            in: idsParam
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean),
          },
        }
      : undefined

    const scales = await prisma.scale.findMany({
      where: whereClause,
      select: {
        id: true,
        isActive: true,
        lastWeight: true,
        lastWeightAt: true,
      },
    })

    return NextResponse.json({ scales })
  } catch (error) {
    console.error("[v0] Error fetching live scales:", error)
    return NextResponse.json(
      { error: "Failed to fetch live scales" },
      { status: 500 },
    )
  }
}
