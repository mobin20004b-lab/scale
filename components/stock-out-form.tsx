"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Scan, Minus, AlertTriangle } from "lucide-react"
import { BarcodeScanner } from "./barcode-scanner"
import { Badge } from "./ui/badge"

const stockOutSchema = z.object({
  product_id: z.string().min(1, "محصول را انتخاب کنید"),
  quantity: z.string().min(0.01, "مقدار باید بیشتر از صفر باشد"),
  recipient: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
})

type StockOutFormData = z.infer<typeof stockOutSchema>

interface Product {
  id: number
  name: string
  barcode: string | null
  unit: string
  current_quantity: number
  alert_threshold: number
}

interface StockOutFormProps {
  products: Product[]
}

export function StockOutForm({ products }: StockOutFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<StockOutFormData>({
    resolver: zodResolver(stockOutSchema),
  })

  const quantity = watch("quantity")

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      setValue("product_id", product.id.toString())
      setSelectedProduct(product)
      setShowScanner(false)
      toast.success(`محصول پیدا شد: ${product.name}`)
    } else {
      toast.error("محصولی با این بارکد یافت نشد")
    }
  }

  const onSubmit = async (data: StockOutFormData) => {
    if (!selectedProduct) return

    const requestedQty = parseFloat(data.quantity)
    if (requestedQty > Number(selectedProduct.current_quantity)) {
      toast.error("موجودی کافی نیست")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/stock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          product_id: parseInt(data.product_id),
          quantity: requestedQty
        })
      })

      if (response.ok) {
        toast.success("خروج کالا با موفقیت ثبت شد")
        reset()
        setSelectedProduct(null)
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || "خطا در ثبت خروج کالا")
      }
    } catch (error) {
      toast.error("خطا در ثبت خروج کالا")
    } finally {
      setIsLoading(false)
    }
  }

  const remainingAfterOut = selectedProduct && quantity
    ? Number(selectedProduct.current_quantity) - parseFloat(quantity)
    : null

  const willBeLowStock = remainingAfterOut !== null && 
    remainingAfterOut <= Number(selectedProduct?.alert_threshold)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Minus className="size-5" />
          ثبت خروج کالا
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>محصول *</Label>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => {
                  setValue("product_id", value)
                  const product = products.find(p => p.id.toString() === value)
                  setSelectedProduct(product || null)
                }}
                value={selectedProduct?.id.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="محصول را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} ({Number(product.current_quantity).toFixed(2)} {product.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(!showScanner)}
              >
                <Scan className="size-4" />
              </Button>
            </div>
            {errors.product_id && (
              <p className="text-sm text-destructive">{errors.product_id.message}</p>
            )}
          </div>

          {showScanner && (
            <BarcodeScanner onScan={handleBarcodeScanned} />
          )}

          {selectedProduct && (
            <div className="p-3 rounded-lg bg-muted space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">موجودی فعلی:</span>
                <Badge>
                  {Number(selectedProduct.current_quantity).toFixed(2)} {selectedProduct.unit}
                </Badge>
              </div>
              {willBeLowStock && (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="size-4" />
                  <span className="text-xs">هشدار: موجودی به سطح بحرانی می‌رسد</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">مقدار *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              {...register("quantity")}
              disabled={isLoading || !selectedProduct}
              dir="ltr"
              placeholder={selectedProduct ? `به ${selectedProduct.unit}` : "مقدار"}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">گیرنده</Label>
            <Input
              id="recipient"
              {...register("recipient")}
              disabled={isLoading}
              dir="rtl"
              placeholder="نام گیرنده"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">شماره مرجع</Label>
            <Input
              id="reference_number"
              {...register("reference_number")}
              disabled={isLoading}
              dir="ltr"
              placeholder="شماره فاکتور یا سند"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">یادداشت</Label>
            <textarea
              id="notes"
              {...register("notes")}
              disabled={isLoading}
              dir="rtl"
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="توضیحات تکمیلی..."
            />
          </div>

          <Button type="submit" disabled={isLoading || !selectedProduct} className="w-full">
            {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
            ثبت خروج کالا
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
