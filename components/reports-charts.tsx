"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface StockIn {
  id: string;
  quantity: number;
  createdAt: Date;
  product: {
    name: string;
    unit: string;
  };
  user?: {
    full_name: string;
  };
  warehouse?: {
    name: string;
  } | null;
}

interface StockOut {
  id: string;
  quantity: number;
  createdAt: Date;
  product: {
    name: string;
    unit: string;
  };
  user?: {
    full_name: string;
  };
  warehouse?: {
    name: string;
  } | null;
}

interface ReportsChartsProps {
  stockIns: StockIn[];
  stockOuts: StockOut[];
  totalStockInQty: number;
  totalStockOutQty: number;
  trendComparison: {
    wowNet: number;
    momNet: number;
  };
}

function shiftBucket(date: Date) {
  const hour = new Date(date).getHours();
  if (hour < 8) return "شیفت شب";
  if (hour < 16) return "شیفت صبح";
  return "شیفت عصر";
}

export function ReportsCharts({
  stockIns,
  stockOuts,
  totalStockInQty,
  totalStockOutQty,
  trendComparison,
}: ReportsChartsProps) {
  const productData = new Map<string, { stockIn: number; stockOut: number }>();
  const warehouseData = new Map<string, number>();
  const operatorData = new Map<string, number>();
  const shiftData = new Map<string, number>();

  const pushSegment = (
    warehouse: string,
    operator: string,
    shift: string,
    qty: number
  ) => {
    warehouseData.set(warehouse, (warehouseData.get(warehouse) ?? 0) + qty);
    operatorData.set(operator, (operatorData.get(operator) ?? 0) + qty);
    shiftData.set(shift, (shiftData.get(shift) ?? 0) + qty);
  };

  stockIns.forEach((item) => {
    const current = productData.get(item.product.name) || {
      stockIn: 0,
      stockOut: 0,
    };
    productData.set(item.product.name, {
      ...current,
      stockIn: current.stockIn + Number(item.quantity),
    });

    pushSegment(
      item.warehouse?.name ?? "بدون انبار",
      item.user?.full_name ?? "نامشخص",
      shiftBucket(item.createdAt),
      Number(item.quantity)
    );
  });

  stockOuts.forEach((item) => {
    const current = productData.get(item.product.name) || {
      stockIn: 0,
      stockOut: 0,
    };
    productData.set(item.product.name, {
      ...current,
      stockOut: current.stockOut + Number(item.quantity),
    });

    pushSegment(
      item.warehouse?.name ?? "بدون انبار",
      item.user?.full_name ?? "نامشخص",
      shiftBucket(item.createdAt),
      Number(item.quantity)
    );
  });

  const chartData = Array.from(productData.entries()).map(([name, data]) => ({
    product: name,
    ورودی: data.stockIn,
    خروجی: data.stockOut,
  }));

  const segmentCharts = [
    {
      key: "warehouse",
      title: "تفکیک بر اساس انبار",
      rows: Array.from(warehouseData.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6),
    },
    {
      key: "operator",
      title: "تفکیک بر اساس اپراتور",
      rows: Array.from(operatorData.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6),
    },
    {
      key: "shift",
      title: "تفکیک بر اساس شیفت",
      rows: Array.from(shiftData.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity),
    },
  ];

  const netChange = totalStockInQty - totalStockOutQty;
  const wowDelta = netChange - trendComparison.wowNet;
  const momDelta = netChange - trendComparison.momNet;
  const anomaly =
    Math.abs(wowDelta) > Math.max(30, Math.abs(trendComparison.wowNet) * 0.4);

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
          <div className="text-3xl font-bold">
            {totalStockOutQty.toFixed(2)}
          </div>
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
          <div className="text-3xl font-bold">{netChange.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">کیلوگرم</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>مقایسه روندها و تشخیص ناهنجاری</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3 text-sm">
            <div className="mb-1 text-muted-foreground">
              مقایسه هفته‌به‌هفته (WoW)
            </div>
            <div className="text-lg font-semibold">
              {wowDelta >= 0 ? "+" : ""}
              {wowDelta.toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="mb-1 text-muted-foreground">
              مقایسه ماه‌به‌ماه (MoM)
            </div>
            <div className="text-lg font-semibold">
              {momDelta >= 0 ? "+" : ""}
              {momDelta.toFixed(2)}
            </div>
          </div>
          {anomaly && (
            <div className="md:col-span-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-600" />
              انحراف عملیاتی قابل‌توجه نسبت به دوره قبل مشاهده شد؛ نیازمند بررسی
              علت است.
            </div>
          )}
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
              <p className="font-medium">
                هنوز داده‌ای برای نمایش نمودار وجود ندارد
              </p>
              <p className="text-sm text-muted-foreground">
                با ثبت اولین ورودی یا خروجی کالا، روندها و مقایسه‌ها در اینجا
                نمایش داده می‌شوند.
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

      {segmentCharts.map((segment) => (
        <Card key={segment.key}>
          <CardHeader>
            <CardTitle className="text-sm">{segment.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {segment.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                داده‌ای موجود نیست.
              </p>
            ) : (
              segment.rows.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between text-sm border-b pb-1"
                >
                  <span className="truncate">{row.name}</span>
                  <span className="font-medium">{row.quantity.toFixed(1)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
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
  );
}
