import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { DashboardStats } from "@/components/dashboard-stats"
import { RecentActivity } from "@/components/recent-activity"
import { LowStockAlert } from "@/components/low-stock-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDictionary } from "@/lib/i18n"
import { getSessionLocale } from "@/lib/i18n-server"

type Trend = "up" | "down" | "flat"

function getTrend(current: number, previous: number): Trend {
  if (current > previous) return "up"
  if (current < previous) return "down"
  return "flat"
}

function getSeverity(count: number) {
  if (count >= 10) return "text-red-600"
  if (count >= 5) return "text-amber-600"
  return "text-emerald-600"
}

export default async function DashboardPage() {
  const locale = await getSessionLocale()
  const t = getDictionary(locale)

  const now = new Date()
  const staleThreshold = new Date(now.getTime() - 5 * 60 * 1000)
  const slaThreshold = new Date(now.getTime() - 30 * 60 * 1000)
  const periodMs = 60 * 60 * 1000
  const periodStart = new Date(now.getTime() - periodMs)
  const previousPeriodStart = new Date(now.getTime() - periodMs * 2)
  const previousStaleThreshold = new Date(periodStart.getTime() - 5 * 60 * 1000)

  const [
    totalProducts,
    totalStockIns,
    totalStockOuts,
    lowStockProducts,
    recentActivities,
    unknownBarcodeCount,
    failedScaleCommands,
    staleScalesCount,
    unknownCurrentWindow,
    unknownPreviousWindow,
    failedCurrentWindow,
    failedPreviousWindow,
    previousStaleScalesCount,
    unknownSlaBreaches,
    failedSlaBreaches,
    staleSlaBreaches,
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
    prisma.unknownBarcodeEvent.count({ where: { createdAt: { gte: periodStart, lt: now } } }),
    prisma.unknownBarcodeEvent.count({ where: { createdAt: { gte: previousPeriodStart, lt: periodStart } } }),
    prisma.scaleCommand.count({ where: { status: "FAILED", createdAt: { gte: periodStart, lt: now } } }),
    prisma.scaleCommand.count({ where: { status: "FAILED", createdAt: { gte: previousPeriodStart, lt: periodStart } } }),
    prisma.scale.count({
      where: {
        isActive: true,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: previousStaleThreshold } }],
      },
    }),
    prisma.unknownBarcodeEvent.count({ where: { status: "OPEN", createdAt: { lt: slaThreshold } } }),
    prisma.scaleCommand.count({ where: { status: "FAILED", createdAt: { lt: slaThreshold } } }),
    prisma.scale.count({
      where: {
        isActive: true,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: slaThreshold } }],
      },
    }),
  ])

  const products = await prisma.product.findMany()
  const totalWeight = products.reduce((sum, p) => sum + Number(p.currentStock), 0)

  const metrics = [
    {
      label: t.dashboard.unknownBarcodes,
      count: unknownBarcodeCount,
      description: t.dashboard.mappingNeeded,
      href: "/dashboard/stock-in",
      cta: t.dashboard.openUnknownQueue,
      trend: getTrend(unknownCurrentWindow, unknownPreviousWindow),
      slaBreaches: unknownSlaBreaches,
    },
    {
      label: t.dashboard.failedCommands,
      count: failedScaleCommands,
      description: t.dashboard.investigateDevices,
      href: "/dashboard/scales?status=failed-commands",
      cta: t.dashboard.reviewFailedCommands,
      trend: getTrend(failedCurrentWindow, failedPreviousWindow),
      slaBreaches: failedSlaBreaches,
    },
    {
      label: t.dashboard.staleScales,
      count: staleScalesCount,
      description: t.dashboard.noConnection5Min,
      href: "/dashboard/scales?status=stale",
      cta: t.dashboard.inspectStaleScales,
      trend: getTrend(staleScalesCount, previousStaleScalesCount),
      slaBreaches: staleSlaBreaches,
    },
  ]

  const trendLabel = {
    up: t.dashboard.trendUp,
    down: t.dashboard.trendDown,
    flat: t.dashboard.trendFlat,
  } as const

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
          <CardTitle>{t.dashboard.operationalInbox}</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/activity">{t.common.viewAll}</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <Badge variant="outline">{metric.slaBreaches} {t.dashboard.slaOver30m}</Badge>
              </div>
              <p className={`text-2xl font-semibold ${getSeverity(metric.count)}`}>{metric.count}</p>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">روند: {trendLabel[metric.trend]}</Badge>
                <Button asChild size="sm" variant="link" className="h-auto p-0">
                  <Link href={metric.href}>{t.dashboard.nextAction}: {metric.cta}</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <LowStockAlert products={lowStockProducts} />
        <RecentActivity activities={recentActivities} />
      </div>
    </div>
  )
}
