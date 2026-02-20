import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { DateTimeText } from "@/components/date-time-text";
import { EmptyStatePanel } from "@/components/ui/async-state";

const getActionColor = (action: string) => {
  if (action.includes("ورود") || action.includes("ایجاد")) return "default";
  if (action.includes("خروج")) return "secondary";
  if (action.includes("حذف")) return "destructive";
  return "outline";
};

const getEntityLink = (entity: string, entityId: string) => {
  if (entity === "Product") return `/dashboard/products/${entityId}/edit`;
  if (entity === "StockIn") return `/dashboard/stock-in?highlight=${entityId}`;
  if (entity === "StockOut")
    return `/dashboard/stock-out?highlight=${entityId}`;
  return "/dashboard/activity";
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    entity?: string;
    user?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;

  const where: any = {};
  if (params.entity && params.entity !== "all") where.entity = params.entity;
  if (params.user && params.user !== "all") where.userId = params.user;
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(`${params.from}T00:00:00`) } : {}),
      ...(params.to ? { lte: new Date(`${params.to}T23:59:59`) } : {}),
    };
  }

  const [activities, users] = await Promise.all([
    prisma.activity.findMany({
      where,
      take: 200,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { full_name: true } } },
    }),
    prisma.user.findMany({
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  const entityValue = params.entity ?? "all";
  const userValue = params.user ?? "all";

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
          <form className="grid gap-3 md:grid-cols-4">
            <select
              name="entity"
              defaultValue={entityValue}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">همه موجودیت‌ها</option>
              <option value="Product">محصول</option>
              <option value="StockIn">ورود</option>
              <option value="StockOut">خروج</option>
            </select>
            <select
              name="user"
              defaultValue={userValue}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">همه کاربران</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <div className="md:col-span-4 flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                اعمال فیلتر
              </button>
              <Link
                href="/dashboard/activity"
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
              >
                پاک کردن
              </Link>
            </div>
          </form>
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
                  <div className="flex items-start gap-4 pb-4 border-b last:border-0">
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

                      {activity.details && (
                        <p className="text-sm">{activity.details}</p>
                      )}

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
        </CardContent>
      </Card>
    </div>
  );
}
