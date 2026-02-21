import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const readingWindows = new Map<string, number[]>()

function getStableWeight(scaleId: string, reading: number, windowSize: number) {
  const current = readingWindows.get(scaleId) ?? []
  const next = [...current, reading].slice(-Math.max(1, windowSize))
  readingWindows.set(scaleId, next)

  const average = next.reduce((sum, value) => sum + value, 0) / next.length
  return Number(average.toFixed(4))
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const scale = await prisma.scale.findUnique({
      where: { id },
      select: {
        id: true,
        lastWeight: true,
        lastWeightAt: true,
        lastHeartbeatAt: true,
        lastStableWeight: true,
        unstableFlag: true,
        spikeFlag: true,
        isActive: true,
        tare: true,
        unit: true,
        precision: true,
      },
    })

    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 })
    }

    return NextResponse.json(scale)
  } catch (error) {
    console.error("[v0] Error fetching scale weight:", error)
    return NextResponse.json(
      { error: "Failed to fetch scale weight" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const authorization = request.headers.get("authorization") || ""
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : ""

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scale = await prisma.scale.findUnique({ where: { id } })
    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 })
    }

    if (scale.apiKey !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const rawWeight = Number(body?.weight)

    if (!Number.isFinite(rawWeight)) {
      return NextResponse.json({ error: "Invalid weight" }, { status: 400 })
    }

    const previousStable = scale.lastStableWeight ?? scale.lastWeight ?? rawWeight
    const outlierThreshold = Math.max(0.1, scale.outlierThreshold ?? 25)
    const delta = Math.abs(rawWeight - previousStable)
    const isOutlier = delta > outlierThreshold

    const normalizedWeight = isOutlier
      ? previousStable
      : getStableWeight(id, rawWeight, scale.stableWindowSize ?? 5)

    const now = new Date()

    await prisma.$transaction([
      prisma.scaleReading.create({
        data: {
          scaleId: id,
          rawWeight,
          normalizedWeight,
          isOutlier,
        },
      }),
      prisma.scale.update({
        where: { id },
        data: {
          lastHeartbeatAt: now,
          lastWeightAt: now,
          lastWeight: normalizedWeight,
          lastStableWeight: normalizedWeight,
          unstableFlag: isOutlier,
          spikeFlag: isOutlier,
          status: "ONLINE",
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      rawWeight,
      normalizedWeight,
      isOutlier,
    })
  } catch (error) {
    console.error("[v0] Error updating scale weight:", error)
    return NextResponse.json(
      { error: "Failed to update scale weight" },
      { status: 500 }
    )
  }
}
