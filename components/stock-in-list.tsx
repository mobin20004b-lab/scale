import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Plus } from "lucide-react";
import { DateTimeText } from "@/components/date-time-text";
import { EmptyStatePanel } from "@/components/ui/async-state";

interface StockIn {
  id: string;
  quantity: number;
  supplier: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
  product: {
    name: string;
    unit: string;
  };
  user: {
    full_name: string;
  };
  warehouse?: {
    name: string;
  } | null;
}

interface StockInListProps {
  stockIns: StockIn[];
  highlightId?: string;
}

export function StockInList({ stockIns, highlightId }: StockInListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          ورودی‌های اخیر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {stockIns.length === 0 ? (
              <EmptyStatePanel
                title="هنوز ورودی ثبت نشده است"
                description="با ثبت اولین ورود کالا، تاریخچه این بخش تکمیل می‌شود."
                icon={<Plus className="size-5" />}
                action={{ label: "ثبت ورود جدید", href: "/dashboard/stock-in" }}
                className="p-4"
              />
            ) : (
              stockIns.map((stockIn) => (
                <div
                  key={stockIn.id}
                  className={`p-4 rounded-lg border bg-card space-y-3 ${highlightId === stockIn.id ? "ring-2 ring-primary/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-base">
                        {stockIn.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ثبت ورودی کالا
                      </p>
                    </div>
                    <Badge variant="default" className="text-sm px-3 py-1">
                      +{Number(stockIn.quantity).toFixed(2)}{" "}
                      {stockIn.product.unit}
                    </Badge>
                  </div>

                  {stockIn.warehouse?.name && (
                    <div className="rounded-md border border-dashed bg-muted/30 px-2 py-1.5 text-sm">
                      <span className="text-muted-foreground">انبار: </span>
                      <span className="font-medium">
                        {stockIn.warehouse.name}
                      </span>
                    </div>
                  )}

                  {stockIn.supplier && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">تامین‌کننده:</span>{" "}
                      {stockIn.supplier}
                    </p>
                  )}

                  {stockIn.invoiceNumber && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">شماره فاکتور:</span>{" "}
                      {stockIn.invoiceNumber}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{stockIn.user.full_name}</span>
                    <span>
                      <DateTimeText value={stockIn.createdAt} showTimeZone />
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
