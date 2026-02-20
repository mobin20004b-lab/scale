import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scales = await prisma.scale.findMany({
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(scales)
  } catch (error) {
    console.error("[v0] Error fetching scales:", error)
    return NextResponse.json({ error: "Failed to fetch scales" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, warehouseId, isActive } = body

    if (!name?.trim() || !warehouseId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const scale = await prisma.scale.create({
      data: {
        name: name.trim(),
        warehouseId,
        isActive: isActive ?? true,
      },
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(scale, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating scale:", error)
    return NextResponse.json({ error: "Failed to create scale" }, { status: 500 })
  }
}
