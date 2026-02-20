import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, sku, barcode, category, unit, alert_threshold, location, description } = body

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        sku: sku || null,
        barcode: barcode || null,
        category: category || null,
        unit,
        alert_threshold: parseFloat(alert_threshold),
        location: location || null,
        description: description || null,
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        user_id: parseInt((session.user as any).id),
        action: "ویرایش محصول",
        details: `محصول "${name}" ویرایش شد`
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('[v0] Error updating product:', error)
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    await prisma.product.delete({
      where: { id: parseInt(id) }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        user_id: parseInt((session.user as any).id),
        action: "حذف محصول",
        details: `محصول "${product.name}" حذف شد`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error deleting product:', error)
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    )
  }
}
