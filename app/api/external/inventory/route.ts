import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireExternalApiAuth } from "@/lib/external-api-auth"

export async function GET(request: Request) {
  try {
    const auth = await requireExternalApiAuth(request);
    if ("error" in auth) {
      return auth.error;
    }

    const [products, totalStockIns, totalStockOuts] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          category: true,
          unit: true,
          currentStock: true,
          minStock: true
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.stockIn.count(),
      prisma.stockOut.count()
    ])

    const totalWeight = products.reduce((sum, p) => sum + Number(p.currentStock), 0)
    
    const lowStockProducts = products.filter(
      p => Number(p.currentStock) <= Number(p.minStock)
    )

    const productsByCategory = products.reduce((acc, product) => {
      const category = product.category || 'بدون دسته‌بندی'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({
        ...product,
        currentStock: Number(product.currentStock),
        minStock: Number(product.minStock),
        is_low_stock: Number(product.currentStock) <= Number(product.minStock)
      })
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      success: true,
      summary: {
        total_products: products.length,
        total_weight_kg: totalWeight,
        total_stock_ins: totalStockIns,
        total_stock_outs: totalStockOuts,
        low_stock_count: lowStockProducts.length
      },
      low_stock_products: lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        currentStock: Number(p.currentStock),
        minStock: Number(p.minStock),
        unit: p.unit
      })),
      products_by_category: productsByCategory,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[v0] External API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
