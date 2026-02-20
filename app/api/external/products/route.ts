import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Simple API key check (in production, use proper token authentication)
function checkAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  
  // In production, validate against database or environment variable
  // For now, we'll accept any bearer token (you should implement proper validation)
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
