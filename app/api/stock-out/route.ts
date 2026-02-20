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
    const { product_id, quantity, recipient, reference_number, notes } = body

    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      )
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: product_id }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check if enough quantity available
    if (Number(product.current_quantity) < parseFloat(quantity)) {
      return NextResponse.json(
        { error: "Insufficient quantity available" },
        { status: 400 }
      )
    }

    // Create stock out record
    const stockOut = await prisma.stockOut.create({
      data: {
        product_id,
        user_id: parseInt((session.user as any).id),
        quantity: parseFloat(quantity),
        recipient: recipient || null,
        reference_number: reference_number || null,
        notes: notes || null
      }
    })

    // Update product quantity
    await prisma.product.update({
      where: { id: product_id },
      data: {
        current_quantity: {
          decrement: parseFloat(quantity)
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        user_id: parseInt((session.user as any).id),
        action: "خروج کالا",
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
