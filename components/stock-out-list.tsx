import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Plus } from "lucide-react";
import { DateTimeText } from "@/components/date-time-text";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import Link from "next/link";

interface StockOut {
  id: string;
  quantity: number;
  customer: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
  product: {
    name: string;
    unit: string;
  };
  user: {
    full_name: string;
  };
}

interface StockOutListProps {
  stockOuts: StockOut[];
}

export function StockOutList({ stockOuts }: StockOutListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          خروجی‌های اخیر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {stockOuts.length === 0 ? (
              <Empty className="p-4">
                <EmptyHeader>
                  <EmptyTitle className="text-base">هنوز خروجی ثبت نشده است</EmptyTitle>
                  <EmptyDescription>
                    پس از ثبت خروج کالا، گزارش این بخش نمایش داده می‌شود.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Link href="/dashboard/stock-out" className="inline-flex">
                    <span className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm">
                      <Plus className="ml-2 size-4" />
                      ثبت خروج جدید
                    </span>
                  </Link>
                </EmptyContent>
              </Empty>
            ) : (
              stockOuts.map((stockOut) => (
                <div
                  key={stockOut.id}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-base">
                        {stockOut.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ثبت خروجی کالا
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      -{Number(stockOut.quantity).toFixed(2)}{" "}
                      {stockOut.product.unit}
                    </Badge>
                  </div>

                  <div className="rounded-md border border-dashed bg-muted/30 px-2 py-1.5 text-sm">
                    <span className="text-muted-foreground">وضعیت: </span>
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      خروج از موجودی
                    </span>
                  </div>

                  {stockOut.customer && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">مشتری:</span>{" "}
                      {stockOut.customer}
                    </p>
                  )}

                  {stockOut.invoiceNumber && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">شماره فاکتور:</span>{" "}
                      {stockOut.invoiceNumber}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{stockOut.user.full_name}</span>
                    <span>
                      <DateTimeText value={stockOut.createdAt} showTimeZone />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
