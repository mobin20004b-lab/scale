import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, History } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { faIR } from "date-fns/locale"

interface Activity {
  id: string
  action: string
  details: string | null
  createdAt: Date
  user: {
    full_name: string
  }
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActionColor = (action: string) => {
    if (action.includes('ورود') || action.includes('STOCK_IN')) return 'default'
    if (action.includes('خروج') || action.includes('STOCK_OUT')) return 'secondary'
    if (action.includes('حذف') || action.includes('DELETE')) return 'destructive'
    return 'outline'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" />
          فعالیت‌های اخیر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
                <History className="size-10 text-muted-foreground" />
                <p className="font-medium">فعلاً فعالیتی ثبت نشده است</p>
                <p className="text-sm text-muted-foreground">
                  بعد از ثبت اولین عملیات ورود یا خروج کالا، سوابق این بخش تکمیل می‌شود.
                </p>
                <Link href="/dashboard/stock-in">
                  <Button>ثبت اولین فعالیت</Button>
                </Link>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-4 border-b last:border-0"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionColor(activity.action)}>
                        {activity.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        توسط {activity.user.full_name}
                      </span>
                    </div>
                    {activity.details && (
                      <p className="text-sm text-muted-foreground">
                        {activity.details}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                        locale: faIR
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
