import { StockInForm } from "@/components/stock-in-form"
import { StockInList } from "@/components/stock-in-list"
import { prisma } from "@/lib/prisma"

export default async function StockInPage() {
  const [products, recentStockIns] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.stockIn.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        user: {
          select: {
            full_name: true
          }
        }
      }
    })
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ورود کالا</h2>
        <p className="text-muted-foreground">
          ثبت ورود کالا به انبار
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StockInForm products={products} />
        <StockInList stockIns={recentStockIns} />
      </div>
    </div>
  )
}
