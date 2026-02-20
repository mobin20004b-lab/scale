import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History } from "lucide-react"
import { DateTimeText } from "@/components/date-time-text"

export default async function ActivityPage() {
  const activities = await prisma.activity.findMany({
    take: 100,
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

  const getActionColor = (action: string) => {
    if (action.includes('ورود') || action.includes('ایجاد')) return 'default'
    if (action.includes('خروج')) return 'secondary'
    if (action.includes('حذف')) return 'destructive'
    if (action.includes('ویرایش')) return 'outline'
    return 'outline'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">سوابق فعالیت</h2>
        <p className="text-muted-foreground">
          تاریخچه کامل عملیات انجام شده
        </p>
      </div>

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
              <p className="text-sm text-muted-foreground text-center py-8">
                هیچ فعالیتی ثبت نشده است
              </p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-0"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionColor(activity.action)}>
                        {activity.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        توسط {activity.user.full_name}
                      </span>
                    </div>
                    
                    {activity.details && (
                      <p className="text-sm">{activity.details}</p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      <DateTimeText value={activity.createdAt} mode="relative" showTimeZone />
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
