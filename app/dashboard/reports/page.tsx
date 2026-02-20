import { prisma } from "@/lib/prisma"
import { ReportsFilters } from "@/components/reports-filters"
import { ReportsCharts } from "@/components/reports-charts"
import { ReportsTable } from "@/components/reports-table"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    startDate?: string
    endDate?: string
    productId?: string
    type?: string
  }>
}) {
  const params = await searchParams
  
  // Default to current month
  const startDate = params.startDate 
    ? new Date(params.startDate)
    : startOfMonth(new Date())
  
  const endDate = params.endDate
    ? new Date(params.endDate)
    : endOfMonth(new Date())

  const productId = params.productId ? parseInt(params.productId) : undefined
  const type = params.type || "all"

  // Fetch data based on filters
  const whereClause: any = {
    created_at: {
      gte: startDate,
      lte: endDate
    }
  }

  if (productId) {
    whereClause.product_id = productId
  }

  const [stockIns, stockOuts, products] = await Promise.all([
    type === "all" || type === "in" ? prisma.stockIn.findMany({
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
    
    type === "all" || type === "out" ? prisma.stockOut.findMany({
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
    
    prisma.product.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  ])

  // Calculate statistics
  const totalStockInQty = stockIns.reduce((sum, item) => sum + Number(item.quantity), 0)
  const totalStockOutQty = stockOuts.reduce((sum, item) => sum + Number(item.quantity), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">گزارش‌ها و تحلیل</h2>
        <p className="text-muted-foreground">
          تحلیل و بررسی عملیات انبار
        </p>
      </div>

      <ReportsFilters 
        products={products}
        initialStartDate={format(startDate, 'yyyy-MM-dd')}
        initialEndDate={format(endDate, 'yyyy-MM-dd')}
        initialProductId={productId?.toString()}
        initialType={type}
      />

      <ReportsCharts
        stockIns={stockIns}
        stockOuts={stockOuts}
        totalStockInQty={totalStockInQty}
        totalStockOutQty={totalStockOutQty}
      />

      <ReportsTable
        stockIns={stockIns}
        stockOuts={stockOuts}
        type={type}
      />
    </div>
  )
}
