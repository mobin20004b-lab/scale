import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Product {
  id: string
  name: string
  currentStock: number
  minStock: number
  unit: string
}

interface LowStockAlertProps {
  products: Product[]
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-orange-600" />
          هشدار موجودی کم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            همه محصولات در وضعیت مناسبی هستند
          </p>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertDescription>
                {products.length} محصول در سطح بحرانی موجودی قرار دارند
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="destructive" className="text-xs">
                        {Number(product.currentStock).toFixed(2)} {product.unit}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        حداقل: {Number(product.minStock).toFixed(2)} {product.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/products">
              <Button variant="outline" className="w-full">
                مشاهده همه محصولات
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
