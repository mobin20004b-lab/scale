import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, History } from "lucide-react";
import Link from "next/link";
import { DateTimeText } from "@/components/date-time-text";
import { EmptyStatePanel } from "@/components/ui/async-state";

interface Activity {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  createdAt: Date;
  user: {
    full_name: string;
  };
}

interface RecentActivityProps {
  activities: Activity[];
}

const getEntityLink = (entity: string, entityId: string) => {
  if (entity === "Product") return `/dashboard/products/${entityId}/edit`;
  if (entity === "StockIn") return `/dashboard/stock-in?highlight=${entityId}`;
  if (entity === "StockOut")
    return `/dashboard/stock-out?highlight=${entityId}`;
  return "/dashboard/activity";
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActionColor = (action: string) => {
    if (action.includes("ورود") || action.includes("STOCK_IN"))
      return "default";
    if (action.includes("خروج") || action.includes("STOCK_OUT"))
      return "secondary";
    if (action.includes("حذف") || action.includes("DELETE"))
      return "destructive";
    return "outline";
  };

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
              <EmptyStatePanel
                title="فعلاً فعالیتی ثبت نشده است"
                description="بعد از ثبت اولین عملیات ورود یا خروج کالا، سوابق این بخش تکمیل می‌شود."
                icon={<History className="size-5" />}
                action={{
                  label: "ثبت اولین فعالیت",
                  href: "/dashboard/stock-in",
                }}
                className="min-h-[320px]"
              />
            ) : (
              activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={getEntityLink(activity.entity, activity.entityId)}
                  className="block rounded-md p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3 pb-4 border-b last:border-0">
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
