import { NextResponse } from "next/server"
import { requireSession } from "@/lib/route-guards"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireSession()
    if ("error" in guard) {
      return guard.error
    }

    const { id } = await context.params
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { scales: true, stockIns: true },
        },
      },
    })

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 })
    }

    return NextResponse.json(warehouse)
  } catch (error) {
    console.error("[v0] Error fetching warehouse:", error)
    return NextResponse.json({ error: "Failed to fetch warehouse" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireSession({ adminOnly: true })
    if ("error" in guard) {
      return guard.error
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, location, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        name: name.trim(),
        location: location?.trim() || null,
        description: description?.trim() || null,
      },
    })

    return NextResponse.json(warehouse)
  } catch (error) {
    console.error("[v0] Error updating warehouse:", error)
    return NextResponse.json({ error: "Failed to update warehouse" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireSession({ adminOnly: true })
    if ("error" in guard) {
      return guard.error
    }

    const { id } = await context.params
    await prisma.warehouse.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting warehouse:", error)
    return NextResponse.json({ error: "Failed to delete warehouse" }, { status: 500 })
  }
}
