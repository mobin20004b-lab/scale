"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimeText } from "@/components/date-time-text";
import { EmptyStatePanel } from "@/components/ui/async-state";

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
  highlightId?: string;
}

export function StockOutList({ stockOuts, highlightId }: StockOutListProps) {
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
              <EmptyStatePanel
                title="هنوز خروجی ثبت نشده است"
                description="پس از ثبت خروج کالا، گزارش این بخش نمایش داده می‌شود."
                icon={<Plus className="size-5" />}
                action={{
                  label: "ثبت خروج جدید",
                  href: "/dashboard/stock-out",
                }}
                className="p-4"
              />
            ) : (
              stockOuts.map((stockOut) => (
                <div
                  key={stockOut.id}
                  className={`p-4 rounded-lg border bg-card space-y-3 ${highlightId === stockOut.id ? "ring-2 ring-primary/50" : ""}`}
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => window.print()}><Printer className="size-3.5 ml-1" />چاپ مجدد لیبل</Button>
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
