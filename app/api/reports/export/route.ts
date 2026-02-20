import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const productId = searchParams.get('productId')
    const type = searchParams.get('type') || 'all'

    const whereClause: any = {}
    
    if (startDate && endDate) {
      whereClause.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (productId) {
      whereClause.product_id = parseInt(productId)
    }

    const [stockIns, stockOuts] = await Promise.all([
      type === 'all' || type === 'in' ? prisma.stockIn.findMany({
        where: whereClause,
        include: {
          product: true,
          user: {
            select: {
              full_name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }) : Promise.resolve([]),
      
      type === 'all' || type === 'out' ? prisma.stockOut.findMany({
        where: whereClause,
        include: {
          product: true,
          user: {
            select: {
              full_name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }) : Promise.resolve([])
    ])

    // Create CSV content
    const csvRows = [
      ['تاریخ', 'نوع', 'محصول', 'مقدار', 'واحد', 'طرف معامله', 'شماره مرجع', 'کاربر'].join(',')
    ]

    stockIns.forEach(item => {
      csvRows.push([
        format(new Date(item.created_at), 'yyyy/MM/dd HH:mm'),
        'ورودی',
        item.product.name,
        item.quantity.toString(),
        item.product.unit,
        item.supplier || '-',
        item.reference_number || '-',
        item.user.full_name
      ].join(','))
    })

    stockOuts.forEach(item => {
      csvRows.push([
        format(new Date(item.created_at), 'yyyy/MM/dd HH:mm'),
        'خروجی',
        item.product.name,
        item.quantity.toString(),
        item.product.unit,
        item.recipient || '-',
        item.reference_number || '-',
        item.user.full_name
      ].join(','))
    })

    const csv = csvRows.join('\n')
    
    // Add UTF-8 BOM for Excel compatibility with Persian
    const bom = '\uFEFF'
    const csvWithBom = bom + csv

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="warehouse-report-${format(new Date(), 'yyyy-MM-dd')}.csv"`
      }
    })
  } catch (error) {
    console.error('[v0] Error exporting report:', error)
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    )
  }
}
