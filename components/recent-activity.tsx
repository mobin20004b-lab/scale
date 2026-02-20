import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, History } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { faIR } from "date-fns/locale"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

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
              <Empty className="border-0 p-0 md:p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>فعالیتی یافت نشد</EmptyTitle>
                  <EmptyDescription>
                    هنوز هیچ فعالیتی در سیستم ثبت نشده است.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
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
