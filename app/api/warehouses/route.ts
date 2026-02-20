import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: { scales: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(warehouses)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, location } = body

    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 })
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        code,
        location: location || null,
      },
    })

    return NextResponse.json(warehouse, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 })
  }
}
