"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Scan, Plus, ScaleIcon } from "lucide-react"
import { BarcodeScanner } from "./barcode-scanner"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("failed to fetch")
  }
  return res.json()
}

const stockInSchema = z.object({
  productId: z.string().min(1, "محصول را انتخاب کنید"),
  warehouseId: z.string().min(1, "انبار را انتخاب کنید"),
  scaleId: z.string().optional(),
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
  code: string
}

interface Scale {
  id: string
  name: string
  warehouseId: string
  unit: string
  lastWeight: number | null
  warehouse: {
    name: string
  }
}

interface LiveScaleResponse {
  id: string
  name: string
  unit: string
  lastWeight: number | null
  lastSeenAt: string | null
  isOnline: boolean
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

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<StockInFormData>({
    resolver: zodResolver(stockInSchema),
  })

  const availableScales = useMemo(
    () => scales.filter((scale) => scale.warehouseId === selectedWarehouseId),
    [scales, selectedWarehouseId]
  )

  const { data: liveScale } = useSWR<LiveScaleResponse>(
    selectedScaleId ? `/api/scales/${selectedScaleId}/live` : null,
    fetcher,
    { refreshInterval: 1000 }
  )

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode)
    if (product) {
      setValue("productId", product.id)
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
      const response = await fetch("/api/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          quantity: parseFloat(data.quantity),
          scaleId: data.scaleId || null,
          weight: liveScale?.lastWeight,
        }),
      })

      if (response.ok) {
        toast.success("ورود کالا با موفقیت ثبت شد")
        reset()
        setSelectedProduct(null)
        setSelectedWarehouseId("")
        setSelectedScaleId("")
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || "خطا در ثبت ورود کالا")
      }
    } catch (error) {
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
            <Label>محصول *</Label>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => {
                  setValue("productId", value)
                  const product = products.find((p) => p.id === value)
                  setSelectedProduct(product || null)
                }}
                value={selectedProduct?.id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="محصول را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setShowScanner(!showScanner)}>
                <Scan className="size-4" />
              </Button>
            </div>
            {errors.productId && <p className="text-sm text-destructive">{errors.productId.message}</p>}
          </div>

          {showScanner && <BarcodeScanner onScan={handleBarcodeScanned} />}

          <div className="space-y-2">
            <Label>انبار *</Label>
            <Select
              onValueChange={(value) => {
                setValue("warehouseId", value)
                setSelectedWarehouseId(value)
                setSelectedScaleId("")
                setValue("scaleId", "")
              }}
              value={selectedWarehouseId}
            >
              <SelectTrigger>
                <SelectValue placeholder="انبار را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouseId && <p className="text-sm text-destructive">{errors.warehouseId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>باسکول (اختیاری)</Label>
            <Select
              onValueChange={(value) => {
                setValue("scaleId", value === "manual" ? "" : value)
                setSelectedScaleId(value === "manual" ? "" : value)
              }}
              value={selectedScaleId || "manual"}
            >
              <SelectTrigger>
                <SelectValue placeholder="باسکول را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">ورود دستی</SelectItem>
                {availableScales.map((scale) => (
                  <SelectItem key={scale.id} value={scale.id}>
                    {scale.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedScaleId && (
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ScaleIcon className="size-4" />
                وزن لحظه‌ای باسکول
              </div>
              <p className="text-lg font-bold" dir="ltr">
                {liveScale?.lastWeight !== null && liveScale?.lastWeight !== undefined
                  ? `${Number(liveScale.lastWeight).toFixed(2)} ${liveScale.unit}`
                  : "---"}
              </p>
              <p className="text-xs text-muted-foreground">
                وضعیت: {liveScale?.isOnline ? "آنلاین" : "آفلاین"} (به‌روزرسانی هر ۱ ثانیه)
              </p>
            </div>
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
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
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

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
            ثبت ورود کالا
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
