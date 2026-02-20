import { StockInForm } from "@/components/stock-in-form"
import { StockInList } from "@/components/stock-in-list"
import { prisma } from "@/lib/prisma"

export default async function StockInPage() {
  const [products, warehouses, scales, recentStockIns] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.scale.findMany({
      where: { isActive: true },
      include: {
        warehouse: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.stockIn.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        warehouse: true,
        scale: true,
        user: {
          select: {
            full_name: true,
          },
        },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ورود کالا</h2>
        <p className="text-muted-foreground">ثبت ورود کالا به انبار با وزن لحظه‌ای باسکول</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StockInForm products={products} warehouses={warehouses} scales={scales} />
        <StockInList stockIns={recentStockIns} />
      </div>
    </div>
  )
}
