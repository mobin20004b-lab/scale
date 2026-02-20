import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { History } from "lucide-react"
import { format } from "date-fns"
import { faIR } from "date-fns/locale"

interface StockIn {
  id: string
  quantity: number
  supplier: string | null
  invoiceNumber: string | null
  createdAt: Date
  product: {
    name: string
    unit: string
  }
  user: {
    full_name: string
  }
  warehouse?: {
    name: string
  } | null
}

interface StockInListProps {
  stockIns: StockIn[]
}

export function StockInList({ stockIns }: StockInListProps) {
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
              <p className="text-sm text-muted-foreground text-center py-8">
                هیچ ورودی ثبت نشده است
              </p>
            ) : (
              stockIns.map((stockIn) => (
                <div
                  key={stockIn.id}
                  className="p-4 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{stockIn.product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default">
                          +{Number(stockIn.quantity).toFixed(2)} {stockIn.product.unit}
                        </Badge>
                        {stockIn.warehouse?.name && (
                          <Badge variant="secondary">{stockIn.warehouse.name}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {stockIn.supplier && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">تامین‌کننده:</span> {stockIn.supplier}
                    </p>
                  )}

                  {stockIn.invoiceNumber && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">شماره فاکتور:</span> {stockIn.invoiceNumber}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{stockIn.user.full_name}</span>
                    <span>
                      {format(new Date(stockIn.createdAt), 'yyyy/MM/dd HH:mm', { locale: faIR })}
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
