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
    const { productId, quantity, supplier, invoiceNumber, notes } = body

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

    // Create stock in record
    const stockIn = await prisma.stockIn.create({
      data: {
        productId,
        userId: (session.user as any).id,
        quantity: parseFloat(quantity),
        supplier: supplier || null,
        invoiceNumber: invoiceNumber || null,
        notes: notes || null
      }
    })

    // Update product quantity
    await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: {
          increment: parseFloat(quantity)
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: (session.user as any).id,
        action: "ورود کالا",
        entity: "StockIn",
        entityId: stockIn.id,
        details: `${parseFloat(quantity)} ${product.unit} از "${product.name}" به انبار اضافه شد`
      }
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
