import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const scale = await prisma.scale.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    })

    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: scale.id,
      name: scale.name,
      unit: scale.unit,
      warehouse: scale.warehouse,
      lastWeight: scale.lastWeight,
      lastSeenAt: scale.lastSeenAt,
      isOnline: !!scale.lastSeenAt && Date.now() - scale.lastSeenAt.getTime() <= 5000,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch live scale" }, { status: 500 })
  }
}
