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
    const { productId, quantity, supplier, invoiceNumber, notes, warehouseId, scaleId, scaleWeight } = body

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      )
    }

    const parsedQuantity = parseFloat(String(quantity))

    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const stockIn = await prisma.$transaction(async (tx) => {
      const createdStockIn = await tx.stockIn.create({
        data: {
          productId,
          userId: (session.user as any).id,
          quantity: parsedQuantity,
          weight: parsedQuantity,
          supplier: supplier || null,
          invoiceNumber: invoiceNumber || null,
          notes: notes || null,
          warehouseId: warehouseId || null,
          scaleId: scaleId || null,
          scaleWeight: scaleWeight !== undefined && scaleWeight !== null ? Number(scaleWeight) : null,
        }
      })

      await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: {
            increment: parsedQuantity
          }
        }
      })

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "ورود کالا",
          entity: "StockIn",
          entityId: createdStockIn.id,
          details: `${parsedQuantity} ${product.unit} از "${product.name}" به انبار اضافه شد`
        }
      })

      return createdStockIn
    })

    return NextResponse.json(stockIn, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating stock in:', error)
    return NextResponse.json(
      { error: "Failed to create stock in" },
      { status: 500 }
    )
  }
}
