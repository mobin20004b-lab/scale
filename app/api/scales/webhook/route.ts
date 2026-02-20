import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { serialNumber, token, weight, recordedAt } = body

    if (!serialNumber || token === undefined || weight === undefined) {
      return NextResponse.json({ error: "serialNumber, token and weight are required" }, { status: 400 })
    }

    const numericWeight = Number(weight)
    if (Number.isNaN(numericWeight)) {
      return NextResponse.json({ error: "weight must be numeric" }, { status: 400 })
    }

    const scale = await prisma.scale.findUnique({ where: { serialNumber } })
    if (!scale || scale.webhookToken !== token || !scale.isActive) {
      return NextResponse.json({ error: "Scale authentication failed" }, { status: 401 })
    }

    const seenAt = recordedAt ? new Date(recordedAt) : new Date()

    await prisma.$transaction([
      prisma.scale.update({
        where: { id: scale.id },
        data: {
          lastWeight: numericWeight,
          lastSeenAt: seenAt,
        },
      }),
      prisma.scaleReading.create({
        data: {
          scaleId: scale.id,
          weight: numericWeight,
          recordedAt: seenAt,
        },
      }),
    ])

    await prisma.scaleReading.deleteMany({
      where: {
        scaleId: scale.id,
        recordedAt: {
          lt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to process scale webhook" }, { status: 500 })
  }
}
