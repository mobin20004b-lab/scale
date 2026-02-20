import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { productId, quantity, weight, supplier, invoiceNumber, notes, warehouseId, scaleId } = body

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      )
    }

    if (!warehouseId) {
      return NextResponse.json({ error: "Warehouse is required" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 })
    }

    let resolvedScaleId: string | null = null
    let resolvedWeight = Number(weight)

    if (scaleId) {
      const scale = await prisma.scale.findUnique({ where: { id: scaleId } })
      if (!scale || scale.warehouseId !== warehouseId) {
        return NextResponse.json({ error: "Scale not found for selected warehouse" }, { status: 404 })
      }

      if (scale.lastWeight === null || scale.lastWeight === undefined) {
        return NextResponse.json({ error: "Scale has no live weight yet" }, { status: 400 })
      }

      resolvedScaleId = scale.id
      resolvedWeight = Number(scale.lastWeight)
    }

    if (!Number.isFinite(resolvedWeight) || resolvedWeight <= 0) {
      resolvedWeight = Number(quantity)
    }

    const stockIn = await prisma.stockIn.create({
      data: {
        productId,
        userId: (session.user as any).id,
        warehouseId,
        scaleId: resolvedScaleId,
        quantity: Number(quantity),
        weight: resolvedWeight,
        supplier: supplier || null,
        invoiceNumber: invoiceNumber || null,
        notes: notes || null,
      },
    })

    await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: {
          increment: Number(quantity),
        },
      },
    })

    await prisma.activity.create({
      data: {
        userId: (session.user as any).id,
        action: "ورود کالا",
        entity: "StockIn",
        entityId: stockIn.id,
        details: `${Number(quantity)} ${product.unit} از "${product.name}" در ${warehouse.name} ثبت شد`,
      },
    })

    return NextResponse.json(stockIn, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating stock in:", error)
    return NextResponse.json(
      { error: "Failed to create stock in" },
      { status: 500 }
    )
  }
}
