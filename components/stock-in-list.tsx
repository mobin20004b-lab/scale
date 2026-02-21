"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimeText } from "@/components/date-time-text";
import { EmptyStatePanel } from "@/components/ui/async-state";
import { Checkbox } from "@/components/ui/checkbox";

interface StockIn {
  id: string;
  quantity: number;
  supplier: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
  lotBatch?: string | null;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)
    );
  };

  const printLabels = async (ids: string[]) => {
    const response = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "stock-in", stockInIds: ids, size: "50x30" }),
    });

    if (!response.ok) return;
    const data = (await response.json()) as { html: string };
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=700");
    if (!printWindow) return;

    printWindow.document.write(data.html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <History className="size-5" />
            ورودی‌های اخیر
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => printLabels(selectedIds)}
          >
            <Printer className="size-3.5 ml-1" /> چاپ گروهی ({selectedIds.length})
          </Button>
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
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`print-${stockIn.id}`}
                        checked={selectedIds.includes(stockIn.id)}
                        onCheckedChange={(checked) => toggle(stockIn.id, Boolean(checked))}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => printLabels([stockIn.id])}><Printer className="size-3.5 ml-1" />Print tag</Button>
                    </div>
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
