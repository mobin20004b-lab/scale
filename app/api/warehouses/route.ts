import { NextResponse } from "next/server"
import { requireSession } from "@/lib/route-guards"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const guard = await requireSession()
    if ("error" in guard) {
      return guard.error
    }

    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: { scales: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(warehouses)
  } catch (error) {
    console.error("[v0] Error fetching warehouses:", error)
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireSession({ adminOnly: true })
    if ("error" in guard) {
      return guard.error
    }

    const body = await request.json()
    const { name, location, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: name.trim(),
        location: location?.trim() || null,
        description: description?.trim() || null,
      },
    })

    return NextResponse.json(warehouse, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating warehouse:", error)
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 })
  }
}
