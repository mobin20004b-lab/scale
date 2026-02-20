import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardStats } from "@/components/dashboard-stats"
import { RecentActivity } from "@/components/recent-activity"
import { LowStockAlert } from "@/components/low-stock-alert"

export default async function DashboardPage() {
  const session = await auth()

  // Fetch dashboard statistics
  const [
    totalProducts,
    totalStockIns,
    totalStockOuts,
    lowStockProducts,
    recentActivities
  ] = await Promise.all([
    prisma.product.count(),
    prisma.stockIn.count(),
    prisma.stockOut.count(),
    prisma.product.findMany({
      where: {
        currentStock: {
          lte: prisma.product.fields.minStock
        }
      },
      take: 5,
      orderBy: {
        currentStock: 'asc'
      }
    }),
    prisma.activity.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            full_name: true
          }
        }
      }
    })
  ])

  // Calculate total weight
  const products = await prisma.product.findMany()
  const totalWeight = products.reduce((sum, p) => sum + Number(p.currentStock), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">داشبورد</h2>
        <p className="text-muted-foreground">
          نمای کلی از وضعیت انبار
        </p>
      </div>

      <DashboardStats
        totalProducts={totalProducts}
        totalWeight={totalWeight}
        totalStockIns={totalStockIns}
        totalStockOuts={totalStockOuts}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <LowStockAlert products={lowStockProducts} />
        <RecentActivity activities={recentActivities} />
      </div>
    </div>
  )
}
