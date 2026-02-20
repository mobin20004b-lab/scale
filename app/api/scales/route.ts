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
    const warehouseId = searchParams.get("warehouseId")

    const scales = await prisma.scale.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(scales)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch scales" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, serialNumber, warehouseId, unit } = body

    if (!name || !serialNumber || !warehouseId) {
      return NextResponse.json(
        { error: "name, serialNumber and warehouseId are required" },
        { status: 400 }
      )
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 })
    }

    const scale = await prisma.scale.create({
      data: {
        name,
        serialNumber,
        warehouseId,
        unit: unit || "kg",
      },
    })

    return NextResponse.json(scale, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create scale" }, { status: 500 })
  }
}
