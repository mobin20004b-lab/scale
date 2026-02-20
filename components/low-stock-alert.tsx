import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, ShieldCheck } from "lucide-react"
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
          <AlertTriangle className="size-5 text-orange-700 dark:text-orange-300" />
          هشدار موجودی کم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
            <ShieldCheck className="size-10 text-emerald-600" />
            <p className="font-medium">عالیه! هشدار کم‌موجودی ندارید</p>
            <p className="text-sm text-muted-foreground">
              حداقل موجودی همه کالاها رعایت شده است. می‌توانید موجودی فعلی محصولات را هم مرور کنید.
            </p>
            <Link href="/dashboard/products">
              <Button variant="outline">مشاهده محصولات</Button>
            </Link>
          </div>
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
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {Number(product.currentStock).toFixed(2)} {product.unit}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        حداقل: {Number(product.minStock).toFixed(2)} {product.unit}
                      </span>
                    </div>
                  </div>

                  <Link href={`/dashboard/stock-in?productId=${product.id}`}>
                    <Button size="sm">سفارش سریع</Button>
                  </Link>
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
