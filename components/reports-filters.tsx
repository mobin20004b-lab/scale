"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
}

interface ReportsFiltersProps {
  products: Product[]
  initialStartDate: string
  initialEndDate: string
  initialProductId?: string
  initialType: string
}

export function ReportsFilters({
  products,
  initialStartDate,
  initialEndDate,
  initialProductId,
  initialType,
}: ReportsFiltersProps) {
  const router = useRouter()
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [productId, setProductId] = useState(initialProductId || "all")
  const [type, setType] = useState(initialType)

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    if (productId && productId !== "all") params.set("productId", productId)
    if (type) params.set("type", type)

    router.push(`/dashboard/reports?${params.toString()}`)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      applyFilters()
    }, 400)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, productId, type])

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      if (productId && productId !== "all") params.set("productId", productId)
      if (type) params.set("type", type)

      const response = await fetch(`/api/reports/export?${params.toString()}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `warehouse-report-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("گزارش با موفقیت دانلود شد")
      } else {
        toast.error("خطا در دانلود گزارش")
      }
    } catch {
      toast.error("خطا در دانلود گزارش")
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="startDate">از تاریخ</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">تا تاریخ</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>

          <div className="space-y-2">
            <Label>محصول</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="همه محصولات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه محصولات</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>نوع عملیات</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="in">ورودی</SelectItem>
                <SelectItem value="out">خروجی</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleExport} variant="outline" className="w-full">
              <Download className="size-4 ml-2" />
              دانلود
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
