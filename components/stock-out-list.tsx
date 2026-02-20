import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { History } from "lucide-react"
import { DateTimeText } from "@/components/date-time-text"

interface StockOut {
  id: string
  quantity: number
  customer: string | null
  invoiceNumber: string | null
  createdAt: Date
  product: {
    name: string
    unit: string
  }
  user: {
    full_name: string
  }
}

interface StockOutListProps {
  stockOuts: StockOut[]
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
              <p className="text-sm text-muted-foreground text-center py-8">
                هیچ خروجی ثبت نشده است
              </p>
            ) : (
              stockOuts.map((stockOut) => (
                <div
                  key={stockOut.id}
                  className="p-4 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{stockOut.product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          -{Number(stockOut.quantity).toFixed(2)} {stockOut.product.unit}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {stockOut.customer && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">مشتری:</span> {stockOut.customer}
                    </p>
                  )}
                  
                  {stockOut.invoiceNumber && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">شماره فاکتور:</span> {stockOut.invoiceNumber}
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
  )
}
