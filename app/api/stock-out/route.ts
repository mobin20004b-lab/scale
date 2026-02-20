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
    if (Number(product.currentStock) < parseFloat(quantity)) {
      return NextResponse.json(
        { error: "Insufficient quantity available" },
        { status: 400 }
      )
    }

    // Create stock out record
    const stockOut = await prisma.stockOut.create({
      data: {
        productId,
        userId: (session.user as any).id,
        quantity: parseFloat(quantity),
        customer: customer || null,
        invoiceNumber: invoiceNumber || null,
        notes: notes || null
      }
    })

    // Update product quantity
    await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: {
          decrement: parseFloat(quantity)
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: (session.user as any).id,
        action: "خروج کالا",
        entity: "StockOut",
        entityId: stockOut.id,
        details: `${parseFloat(quantity)} ${product.unit} از "${product.name}" از انبار خارج شد`
      }
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
