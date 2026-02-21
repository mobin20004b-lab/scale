import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExternalApiAuth } from "@/lib/external-api-auth"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireExternalApiAuth(request);
    if ("error" in auth) {
      return auth.error;
    }

    const { id } = await context.params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockIns: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            quantity: true,
            supplier: true,
            createdAt: true
          }
        },
        stockOuts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            quantity: true,
            customer: true,
            createdAt: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        currentStock: Number(product.currentStock),
        minStock: Number(product.minStock),
        is_low_stock: Number(product.currentStock) <= Number(product.minStock),
        stockIns: product.stockIns.map(si => ({
          ...si,
          quantity: Number(si.quantity)
        })),
        stockOuts: product.stockOuts.map(so => ({
          ...so,
          quantity: Number(so.quantity)
        }))
      }
    })
  } catch (error) {
    console.error('[v0] External API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
