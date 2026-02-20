"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Loader2, Scan, Plus } from "lucide-react"
import { BarcodeScanner } from "./barcode-scanner"

const stockInSchema = z.object({
  productId: z.string().min(1, "محصول را انتخاب کنید"),
  quantity: z.string().min(1, "مقدار باید بیشتر از صفر باشد"),
  supplier: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
})

type StockInFormData = z.infer<typeof stockInSchema>

interface Product {
  id: string
  name: string
  barcode: string | null
  unit: string
}

interface Warehouse {
  id: string
  name: string
}

interface Scale {
  id: string
  name: string
  warehouseId: string
}

interface StockInFormProps {
  products: Product[]
  warehouses: Warehouse[]
  scales: Scale[]
}

export function StockInForm({ products, warehouses, scales }: StockInFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [selectedScaleId, setSelectedScaleId] = useState<string>("")
  const [liveWeight, setLiveWeight] = useState<number | null>(null)
  const [scannerStatus, setScannerStatus] = useState<"idle" | "scanning" | "success" | "error">("idle")

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<StockInFormData>({
    resolver: zodResolver(stockInSchema),
  })

  const filteredScales = useMemo(
    () => scales.filter((scale) => scale.warehouseId === selectedWarehouseId),
    [scales, selectedWarehouseId]
  )

  useEffect(() => {
    if (!selectedScaleId) {
      setLiveWeight(null)
      return
    }

    const fetchWeight = async () => {
      const response = await fetch(`/api/scales/${selectedScaleId}/weight`)
      if (response.ok) {
        const payload = await response.json()
        setLiveWeight(payload.lastWeight ?? null)
      }
    }

    fetchWeight()
    const interval = setInterval(fetchWeight, 1000)
    return () => clearInterval(interval)
  }, [selectedScaleId])

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode)
    if (product) {
      setValue("productId", product.id.toString())
      setSelectedProduct(product)
      setShowScanner(false)
      toast.success(`محصول پیدا شد: ${product.name}`)
    } else {
      toast.error("محصولی با این بارکد یافت نشد")
    }
  }

  const onSubmit = async (data: StockInFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          productId: data.productId,
          quantity: parseFloat(data.quantity),
          warehouseId: selectedWarehouseId || null,
          scaleId: selectedScaleId || null,
          scaleWeight: liveWeight,
        })
      })

      if (response.ok) {
        toast.success("ورود کالا با موفقیت ثبت شد")
        reset()
        setSelectedProduct(null)
        setSelectedWarehouseId("")
        setSelectedScaleId("")
        setLiveWeight(null)
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || "خطا در ثبت ورود کالا")
      }
    } catch {
      toast.error("خطا در ثبت ورود کالا")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5" />
          ثبت ورود کالا
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>انبار</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={(value) => {
                setSelectedWarehouseId(value)
                setSelectedScaleId("")
              }}
            >
              <SelectTrigger aria-label="انتخاب انبار">
                <SelectValue placeholder="انتخاب انبار" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ترازو</Label>
            <Select value={selectedScaleId} onValueChange={setSelectedScaleId} disabled={!selectedWarehouseId}>
              <SelectTrigger aria-label="انتخاب ترازو">
                <SelectValue placeholder="انتخاب ترازو" />
              </SelectTrigger>
              <SelectContent>
                {filteredScales.map((scale) => (
                  <SelectItem key={scale.id} value={scale.id}>
                    {scale.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedScaleId && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div className="text-sm font-medium">
                وزن زنده: {liveWeight !== null ? `${Number(liveWeight).toFixed(2)} گرم` : "--"}
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (liveWeight !== null) {
                    setValue("quantity", String(liveWeight))
                  }
                }}
              >
                استفاده از وزن ترازو
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>محصول *</Label>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => {
                  setValue("productId", value)
                  const product = products.find((p) => p.id.toString() === value)
                  setSelectedProduct(product || null)
                }}
                value={selectedProduct?.id.toString()}
              >
                <SelectTrigger aria-label="انتخاب محصول">
                  <SelectValue placeholder="محصول را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(!showScanner)}
                aria-label={showScanner ? "بستن اسکنر بارکد" : "باز کردن اسکنر بارکد"}
              >
                <Scan className="size-4" />
              </Button>
            </div>
            {errors.productId && (
              <p className="text-sm text-destructive">{errors.productId.message}</p>
            )}
          </div>

          {showScanner && <BarcodeScanner onScan={handleBarcodeScanned} onStatusChange={setScannerStatus} />}

          {showScanner && (
            <p
              className="text-xs text-center text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {scannerStatus === "scanning" && "در حال اسکن..."}
              {scannerStatus === "success" && "بارکد با موفقیت خوانده شد."}
              {scannerStatus === "error" && "اسکنر در دسترس نیست؛ دسترسی دوربین را بررسی کنید."}
              {scannerStatus === "idle" && "برای اسکن بارکد، دوربین را فعال کنید."}
            </p>
          )}

          {selectedProduct && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">
                <span className="font-medium">واحد:</span> {selectedProduct.unit}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">مقدار *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              {...register("quantity")}
              disabled={isLoading}
              dir="ltr"
              placeholder={selectedProduct ? `به ${selectedProduct.unit}` : "مقدار"}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">تامین‌کننده</Label>
            <Input id="supplier" {...register("supplier")} disabled={isLoading} dir="rtl" placeholder="نام تامین‌کننده" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">شماره فاکتور</Label>
            <Input id="invoiceNumber" {...register("invoiceNumber")} disabled={isLoading} dir="ltr" placeholder="شماره فاکتور یا سند" />
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

          <Button type="submit" disabled={isLoading} className="w-full" aria-busy={isLoading}>
            {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
            ثبت ورود کالا
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
