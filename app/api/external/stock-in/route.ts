import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function checkAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  return !!apiKey
}

export async function POST(request: Request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized - API key required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { productId, quantity, supplier, invoiceNumber, notes } = body

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields: productId, quantity" },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Get system admin user for external API calls
    const systemUser = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    })

    if (!systemUser) {
      return NextResponse.json({ error: "System user not found" }, { status: 500 })
    }

    const parsedQuantity = parseFloat(String(quantity))

    // Create stock in record + update product + activity log atomically
    const stockIn = await prisma.$transaction(async (tx) => {
      const createdStockIn = await tx.stockIn.create({
        data: {
          productId,
          userId: systemUser.id,
          quantity: parsedQuantity,
          supplier: supplier || null,
          invoiceNumber: invoiceNumber || null,
          notes: notes || null
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
          userId: systemUser.id,
          action: "ورود کالا (API)",
          entity: "StockIn",
          entityId: createdStockIn.id,
          details: `${parsedQuantity} ${product.unit} از "${product.name}" از طریق API اضافه شد`
        }
      })

      return createdStockIn
    })

    return NextResponse.json({
      success: true,
      message: "Stock in recorded successfully",
      stock_in: {
        id: stockIn.id,
        productId: stockIn.productId,
        quantity: Number(stockIn.quantity),
        createdAt: stockIn.createdAt
      }
    }, { status: 201 })
  } catch (error) {
    console.error('[v0] External API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
