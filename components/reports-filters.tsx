"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatPersianDate } from "@/lib/date-time"
import { CalendarIcon, Download, Loader2, RefreshCcw, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

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


function toDate(value: string) {
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function DatePickerField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const selectedDate = toDate(value)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-between text-right font-normal",
              !selectedDate && "text-muted-foreground",
            )}
          >
            {selectedDate
              ? formatPersianDate(selectedDate)
              : "انتخاب تاریخ"}
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
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
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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
    setExportError(null)
    setIsExporting(true)

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
        throw new Error("دانلود گزارش انجام نشد")
      }
    } catch {
      setExportError("خطا در دانلود گزارش. اتصال شبکه یا فیلترها را بررسی کنید.")
      toast.error("خطا در دانلود گزارش")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-5">
          <DatePickerField id="startDate" label="از تاریخ" value={startDate} onChange={setStartDate} />

          <DatePickerField id="endDate" label="تا تاریخ" value={endDate} onChange={setEndDate} />

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
            <Button
              onClick={handleExport}
              variant="outline"
              className="w-full"
              disabled={isExporting}
              aria-busy={isExporting}
            >
              {isExporting ? (
                <Loader2 className="size-4 ml-2 animate-spin" />
              ) : (
                <Download className="size-4 ml-2" />
              )}
              دانلود
            </Button>
          </div>
        </div>

        {exportError && (
          <Empty className="mt-4 border border-destructive/40 bg-destructive/5 p-4 md:p-5">
            <EmptyHeader className="max-w-full">
              <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                <TriangleAlert className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="text-base">دانلود گزارش با خطا مواجه شد</EmptyTitle>
              <EmptyDescription>{exportError}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={handleExport} className="w-full sm:w-auto">
                <RefreshCcw className="size-4 ml-2" />
                تلاش مجدد دانلود
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
