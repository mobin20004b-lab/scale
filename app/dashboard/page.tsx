import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardStats } from "@/components/dashboard-stats"
import { RecentActivity } from "@/components/recent-activity"
import { LowStockAlert } from "@/components/low-stock-alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()

  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000)

  const [
    totalProducts,
    totalStockIns,
    totalStockOuts,
    lowStockProducts,
    recentActivities,
    unknownBarcodeCount,
    failedScaleCommands,
    staleScalesCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.stockIn.count(),
    prisma.stockOut.count(),
    prisma.product.findMany({
      where: {
        currentStock: {
          lte: prisma.product.fields.minStock,
        },
      },
      take: 5,
      orderBy: {
        currentStock: "asc",
      },
    }),
    prisma.activity.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            full_name: true,
          },
        },
      },
    }),
    prisma.unknownBarcodeEvent.count({ where: { status: "OPEN" } }),
    prisma.scaleCommand.count({ where: { status: "FAILED" } }),
    prisma.scale.count({
      where: {
        isActive: true,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: staleThreshold } }],
      },
    }),
  ])

  const products = await prisma.product.findMany()
  const totalWeight = products.reduce((sum, p) => sum + Number(p.currentStock), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">خانه عملیات</h2>
        <p className="text-muted-foreground">خلاصه شیفت، هشدارهای بحرانی و کارهای فوری</p>
      </div>

      <DashboardStats
        totalProducts={totalProducts}
        totalWeight={totalWeight}
        totalStockIns={totalStockIns}
        totalStockOuts={totalStockOuts}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Operational Inbox</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/activity">مشاهده همه</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">بارکد ناشناس</p>
            <p className="text-2xl font-semibold">{unknownBarcodeCount}</p>
            <p className="text-xs text-muted-foreground">نیازمند تعیین نگاشت</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">فرمان ناموفق ترازو</p>
            <p className="text-2xl font-semibold">{failedScaleCommands}</p>
            <p className="text-xs text-muted-foreground">بررسی وضعیت دستگاه‌ها</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">ترازوی آفلاین/راکد</p>
            <p className="text-2xl font-semibold">{staleScalesCount}</p>
            <p className="text-xs text-muted-foreground">عدم ارتباط بیش از ۵ دقیقه</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <LowStockAlert products={lowStockProducts} />
        <RecentActivity activities={recentActivities} />
      </div>
    </div>
  )
}
