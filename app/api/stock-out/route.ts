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
    const { productId, quantity, customer, invoiceNumber, notes } = body

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      )
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check if enough quantity available
    if (Number(product.currentStock) < parseFloat(String(quantity))) {
      return NextResponse.json(
        { error: "Insufficient quantity available" },
        { status: 400 }
      )
    }

    const parsedQuantity = parseFloat(String(quantity))

    // Create stock out record + update product quantity + activity log atomically
    const stockOut = await prisma.$transaction(async (tx) => {
      const createdStockOut = await tx.stockOut.create({
        data: {
          productId,
          userId: (session.user as any).id,
          quantity: parsedQuantity,
          customer: customer || null,
          invoiceNumber: invoiceNumber || null,
          notes: notes || null
        }
      })

      await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: {
            decrement: parsedQuantity
          }
        }
      })

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "خروج کالا",
          entity: "StockOut",
          entityId: createdStockOut.id,
          details: `${parsedQuantity} ${product.unit} از "${product.name}" از انبار خارج شد`
        }
      })

      return createdStockOut
    })

    return NextResponse.json(stockOut, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating stock out:', error)
    return NextResponse.json(
      { error: "Failed to create stock out" },
      { status: 500 }
    )
  }
}
