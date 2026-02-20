import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function checkAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  return !!apiKey
}

export async function GET(request: Request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized - API key required" },
        { status: 401 }
      )
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
          current_quantity: true,
          alert_threshold: true,
          location: true
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.stockIn.count(),
      prisma.stockOut.count()
    ])

    const totalWeight = products.reduce((sum, p) => sum + Number(p.current_quantity), 0)
    
    const lowStockProducts = products.filter(
      p => Number(p.current_quantity) <= Number(p.alert_threshold)
    )

    const productsByCategory = products.reduce((acc, product) => {
      const category = product.category || 'بدون دسته‌بندی'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({
        ...product,
        current_quantity: Number(product.current_quantity),
        alert_threshold: Number(product.alert_threshold),
        is_low_stock: Number(product.current_quantity) <= Number(product.alert_threshold)
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
        current_quantity: Number(p.current_quantity),
        alert_threshold: Number(p.alert_threshold),
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
