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
    const { product_id, quantity, recipient, reference_number, notes } = body

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

    if (Number(product.current_quantity) < parseFloat(quantity)) {
      return NextResponse.json(
        { error: "Insufficient quantity available" },
        { status: 400 }
      )
    }

    // Use system user (id: 1) for external API calls
    const stockOut = await prisma.stockOut.create({
      data: {
        product_id,
        user_id: 1,
        quantity: parseFloat(quantity),
        recipient: recipient || null,
        reference_number: reference_number || null,
        notes: notes || null
      }
    })

    await prisma.product.update({
      where: { id: product_id },
      data: {
        current_quantity: {
          decrement: parseFloat(quantity)
        }
      }
    })

    await prisma.activity.create({
      data: {
        user_id: 1,
        action: "خروج کالا (API)",
        details: `${parseFloat(quantity)} ${product.unit} از "${product.name}" از طریق API خارج شد`
      }
    })

    return NextResponse.json({
      success: true,
      message: "Stock out recorded successfully",
      stock_out: {
        id: stockOut.id,
        product_id: stockOut.product_id,
        quantity: Number(stockOut.quantity),
        created_at: stockOut.created_at
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
