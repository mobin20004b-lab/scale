import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const products = await prisma.product.findMany({
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, sku, barcode, category, unit, alert_threshold, location, description } = body

    if (!name || !unit || alert_threshold === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku || null,
        barcode: barcode || null,
        category: category || null,
        unit,
        alert_threshold: parseFloat(alert_threshold),
        location: location || null,
        description: description || null,
        current_quantity: 0
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        user_id: parseInt((session.user as any).id),
        action: "ایجاد محصول",
        details: `محصول "${name}" ایجاد شد`
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating product:', error)
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}
