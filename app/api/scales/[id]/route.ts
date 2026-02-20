import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
    })

    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 })
    }

    return NextResponse.json(scale)
  } catch (error) {
    console.error("[v0] Error fetching scale:", error)
    return NextResponse.json({ error: "Failed to fetch scale" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, warehouseId, isActive } = body

    const scale = await prisma.scale.update({
      where: { id },
      data: {
        name: name?.trim(),
        warehouseId,
        isActive,
      },
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(scale)
  } catch (error) {
    console.error("[v0] Error updating scale:", error)
    return NextResponse.json({ error: "Failed to update scale" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    await prisma.scale.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting scale:", error)
    return NextResponse.json({ error: "Failed to delete scale" }, { status: 500 })
  }
}
