"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { BarChart3, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface StockIn {
  id: string
  quantity: number
  createdAt: Date
  product: {
    name: string
    unit: string
  }
}

interface StockOut {
  id: string
  quantity: number
  createdAt: Date
  product: {
    name: string
    unit: string
  }
}

interface ReportsChartsProps {
  stockIns: StockIn[]
  stockOuts: StockOut[]
  totalStockInQty: number
  totalStockOutQty: number
}

export function ReportsCharts({
  stockIns,
  stockOuts,
  totalStockInQty,
  totalStockOutQty
}: ReportsChartsProps) {
  // Aggregate data by product
  const productData = new Map<string, { stockIn: number; stockOut: number }>()

  stockIns.forEach(item => {
    const current = productData.get(item.product.name) || { stockIn: 0, stockOut: 0 }
    productData.set(item.product.name, {
      ...current,
      stockIn: current.stockIn + Number(item.quantity)
    })
  })

  stockOuts.forEach(item => {
    const current = productData.get(item.product.name) || { stockIn: 0, stockOut: 0 }
    productData.set(item.product.name, {
      ...current,
      stockOut: current.stockOut + Number(item.quantity)
    })
  })

  const chartData = Array.from(productData.entries()).map(([name, data]) => ({
    product: name,
    ورودی: data.stockIn,
    خروجی: data.stockOut
  }))

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            کل ورودی
          </CardTitle>
          <TrendingUp className="size-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalStockInQty.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stockIns.length} تراکنش
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            کل خروجی
          </CardTitle>
          <TrendingDown className="size-5 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalStockOutQty.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stockOuts.length} تراکنش
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            خالص تغییرات
          </CardTitle>
          <Activity className="size-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {(totalStockInQty - totalStockOutQty).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            کیلوگرم
          </p>
        </CardContent>
      </Card>

      {chartData.length > 0 ? (
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              نمودار ورودی و خروجی به تفکیک محصول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ورودی" fill="hsl(var(--chart-1))" />
                <Bar dataKey="خروجی" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              نمودار ورودی و خروجی
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium">هنوز داده‌ای برای نمایش نمودار وجود ندارد</p>
              <p className="text-sm text-muted-foreground">
                با ثبت اولین ورودی یا خروجی کالا، روندها و مقایسه‌ها در اینجا نمایش داده می‌شوند.
              </p>
              <div className="flex gap-2">
                <Link href="/dashboard/stock-in">
                  <Button>ثبت ورودی کالا</Button>
                </Link>
                <Link href="/dashboard/stock-out">
                  <Button variant="outline">ثبت خروجی کالا</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


export function ReportsChartsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-5 rounded-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </CardContent>
        </Card>
      ))}
      <Card className="md:col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
