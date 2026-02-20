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
      orderBy: { createdAt: 'desc' }
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
    const { name, sku, barcode, category, unit, minStock, description } = body

    if (!name || !unit || minStock === undefined) {
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
        minStock: parseFloat(minStock),
        description: description || null,
        currentStock: 0
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: (session.user as any).id,
        action: "ایجاد محصول",
        entity: "Product",
        entityId: product.id,
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
