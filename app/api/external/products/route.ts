import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExternalApiAuth } from "@/lib/external-api-auth"

export async function GET(request: Request) {
  try {
    const auth = await requireExternalApiAuth(request);
    if ("error" in auth) {
      return auth.error;
    }

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        category: true,
        unit: true,
        currentStock: true,
        minStock: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      count: products.length,
      products: products.map(p => ({
        ...p,
        currentStock: Number(p.currentStock),
        minStock: Number(p.minStock),
        is_low_stock: Number(p.currentStock) <= Number(p.minStock)
      }))
    })
  } catch (error) {
    console.error('[v0] External API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
