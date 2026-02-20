import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function checkAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  return !!apiKey
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized - API key required" },
        { status: 401 }
      )
    }

    const { id } = await context.params

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        stock_ins: {
          take: 10,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            quantity: true,
            supplier: true,
            created_at: true
          }
        },
        stock_outs: {
          take: 10,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            quantity: true,
            recipient: true,
            created_at: true
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
        current_quantity: Number(product.current_quantity),
        alert_threshold: Number(product.alert_threshold),
        is_low_stock: Number(product.current_quantity) <= Number(product.alert_threshold),
        stock_ins: product.stock_ins.map(si => ({
          ...si,
          quantity: Number(si.quantity)
        })),
        stock_outs: product.stock_outs.map(so => ({
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
