import { prisma } from "@/lib/prisma"
import { ReportsFilters } from "@/components/reports-filters"
import { ReportsCharts } from "@/components/reports-charts"
import { ReportsTable } from "@/components/reports-table"
import {
  getDefaultBusinessMonthRange,
  getTimeZoneLabel,
  reportQuerySchema,
  resolveBusinessTimeZone,
  toBusinessDayEnd,
  toBusinessDayStart,
} from "@/lib/business-timezone"
import { readSystemSettings } from "@/lib/system-settings"

type SearchParams = {
  startDate?: string
  endDate?: string
  productId?: string
  type?: string
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const settings = await readSystemSettings()
  const businessTimeZone = resolveBusinessTimeZone(settings.general.timezone)
  const defaultRange = getDefaultBusinessMonthRange(businessTimeZone)

  const parsed = reportQuerySchema.safeParse(params)
  const validParams = parsed.success ? parsed.data : {}

  const startDate = validParams.startDate ?? defaultRange.startDate
  const endDate = validParams.endDate ?? defaultRange.endDate

  const startBoundary = toBusinessDayStart(startDate, businessTimeZone)
  const endBoundary = toBusinessDayEnd(endDate, businessTimeZone)

  const productId =
    validParams.productId && validParams.productId !== "all"
      ? validParams.productId
      : undefined
  const type = validParams.type ?? "all"

  const whereClause: any = {
    createdAt: {
      gte: startBoundary,
      lte: endBoundary,
    },
  }

  if (productId) {
    whereClause.productId = productId
  }

  const [stockIns, stockOuts, products] = await Promise.all([
    type === "all" || type === "in"
      ? prisma.stockIn.findMany({
          where: whereClause,
          include: {
            product: true,
            user: {
              select: {
                full_name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : Promise.resolve([]),

    type === "all" || type === "out"
      ? prisma.stockOut.findMany({
          where: whereClause,
          include: {
            product: true,
            user: {
              select: {
                full_name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : Promise.resolve([]),

    prisma.product.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ])

  const totalStockInQty = stockIns.reduce((sum, item) => sum + Number(item.quantity), 0)
  const totalStockOutQty = stockOuts.reduce((sum, item) => sum + Number(item.quantity), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">گزارش‌ها و تحلیل</h2>
        <p className="text-muted-foreground">تحلیل و بررسی عملیات انبار</p>
      </div>

      <ReportsFilters
        products={products}
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialProductId={productId?.toString()}
        initialType={type}
        timeZoneLabel={getTimeZoneLabel(businessTimeZone)}
      />

      <ReportsCharts
        stockIns={stockIns}
        stockOuts={stockOuts}
        totalStockInQty={totalStockInQty}
        totalStockOutQty={totalStockOutQty}
      />

      <ReportsTable stockIns={stockIns} stockOuts={stockOuts} />
    </div>
  )
}
