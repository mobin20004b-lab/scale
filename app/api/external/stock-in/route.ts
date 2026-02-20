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
    const { product_id, quantity, supplier, reference_number, notes } = body

    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields: product_id, quantity" },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: product_id }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Use system user (id: 1) for external API calls
    const stockIn = await prisma.stockIn.create({
      data: {
        product_id,
        user_id: 1,
        quantity: parseFloat(quantity),
        supplier: supplier || null,
        reference_number: reference_number || null,
        notes: notes || null
      }
    })

    await prisma.product.update({
      where: { id: product_id },
      data: {
        current_quantity: {
          increment: parseFloat(quantity)
        }
      }
    })

    await prisma.activity.create({
      data: {
        user_id: 1,
        action: "ورود کالا (API)",
        details: `${parseFloat(quantity)} ${product.unit} از "${product.name}" از طریق API اضافه شد`
      }
    })

    return NextResponse.json({
      success: true,
      message: "Stock in recorded successfully",
      stock_in: {
        id: stockIn.id,
        product_id: stockIn.product_id,
        quantity: Number(stockIn.quantity),
        created_at: stockIn.created_at
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
