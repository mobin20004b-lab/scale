import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { History } from "lucide-react"
import { DateTimeText } from "@/components/date-time-text"
import { EmptyStatePanel } from "@/components/ui/async-state"
import { ActivityFilters } from "@/components/activity-filters"
import {
  activityQuerySchema,
  formatDateOnlyInTimeZone,
  getTimeZoneLabel,
  resolveBusinessTimeZone,
  toBusinessDayEnd,
  toBusinessDayStart,
} from "@/lib/business-timezone"
import { readSystemSettings } from "@/lib/system-settings"

const getActionColor = (action: string) => {
  if (action.includes("ورود") || action.includes("ایجاد")) return "default"
  if (action.includes("خروج")) return "secondary"
  if (action.includes("حذف")) return "destructive"
  return "outline"
}

const getEntityLink = (entity: string, entityId: string) => {
  if (entity === "Product") return `/dashboard/products/${entityId}/edit`
  if (entity === "StockIn") return `/dashboard/stock-in?highlight=${entityId}`
  if (entity === "StockOut") return `/dashboard/stock-out?highlight=${entityId}`
  return "/dashboard/activity"
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    entity?: string
    user?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const [params, settings] = await Promise.all([searchParams, readSystemSettings()])
  const businessTimeZone = resolveBusinessTimeZone(settings.general.timezone)
  const pageSize = 50

  const parsedPage = Number(params.page ?? "1")
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1

  const parsed = activityQuerySchema.safeParse(params)
  const validParams = parsed.success ? parsed.data : {}

  const where: any = {}
  if (validParams.entity && validParams.entity !== "all") where.entity = validParams.entity
  if (validParams.user && validParams.user !== "all") where.userId = validParams.user
  if (validParams.from || validParams.to) {
    where.createdAt = {
      ...(validParams.from
        ? { gte: toBusinessDayStart(validParams.from, businessTimeZone) }
        : {}),
      ...(validParams.to
        ? { lte: toBusinessDayEnd(validParams.to, businessTimeZone) }
        : {}),
    }
  }

  const [activities, users, totalCount] = await Promise.all([
    prisma.activity.findMany({
      where,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { full_name: true } } },
    }),
    prisma.user.findMany({
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.activity.count({ where }),
  ])

  const entityValue = validParams.entity ?? "all"
  const userValue = validParams.user ?? "all"
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const now = new Date()
  const today = formatDateOnlyInTimeZone(now, businessTimeZone)
  const weekStart = formatDateOnlyInTimeZone(
    new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    businessTimeZone,
  )
  const monthStart = `${today.slice(0, 8)}01`

  const buildPageUrl = (page: number) => {
    const query = new URLSearchParams()

    if (entityValue !== "all") query.set("entity", entityValue)
    if (userValue !== "all") query.set("user", userValue)
    if (validParams.from) query.set("from", validParams.from)
    if (validParams.to) query.set("to", validParams.to)
    if (page > 1) query.set("page", String(page))

    const queryString = query.toString()
    return queryString ? `/dashboard/activity?${queryString}` : "/dashboard/activity"
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">سوابق فعالیت</h2>
        <p className="text-muted-foreground">تاریخچه کامل عملیات انجام شده</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            فیلترها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-muted-foreground">
            بازه‌های تاریخ بر اساس منطقه زمانی فعال: {getTimeZoneLabel(businessTimeZone)}
          </div>
          <ActivityFilters
            users={users}
            initialEntity={entityValue}
            initialUser={userValue}
            initialFrom={validParams.from ?? ""}
            initialTo={validParams.to ?? ""}
            quickRanges={{
              today: { from: today, to: today },
              week: { from: weekStart, to: today },
              month: { from: monthStart, to: today },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            فعالیت‌های اخیر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">
            نمایش {(currentPage - 1) * pageSize + 1} تا {Math.min(currentPage * pageSize, totalCount)} از {totalCount} مورد
          </div>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <EmptyStatePanel
                title="هیچ فعالیتی یافت نشد"
                description="فیلترها را تغییر دهید یا بازه زمانی بزرگ‌تری انتخاب کنید."
                className="py-10"
              />
            ) : (
              activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={getEntityLink(activity.entity, activity.entityId)}
                  className="block rounded-md p-2 hover:bg-muted/40"
                >
                  <div className="flex items-start gap-4 border-b pb-4 last:border-0">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionColor(activity.action)}>
                          {activity.action}
                        </Badge>
                        <Badge variant="outline">{activity.entity}</Badge>
                        <span className="text-sm text-muted-foreground">
                          توسط {activity.user.full_name}
                        </span>
                      </div>

                      {activity.details && <p className="text-sm">{activity.details}</p>}

                      <p className="text-xs text-muted-foreground">
                        <DateTimeText
                          value={activity.createdAt}
                          mode="relative"
                          showTimeZone
                        />
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {activities.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
                  <Link href={buildPageUrl(Math.max(1, currentPage - 1))}>صفحه قبل</Link>
                </Button>
                <span className="text-sm text-muted-foreground">
                  صفحه {currentPage} از {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={currentPage >= totalPages}
                >
                  <Link href={buildPageUrl(Math.min(totalPages, currentPage + 1))}>صفحه بعد</Link>
                </Button>
              </div>

              {currentPage < totalPages && (
                <Button asChild>
                  <Link href={buildPageUrl(currentPage + 1)}>بارگذاری بیشتر</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
