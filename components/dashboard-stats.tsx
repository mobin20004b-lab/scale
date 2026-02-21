import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Weight, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardStatsProps {
  totalProducts: number;
  totalWeight: number;
  totalStockIns: number;
  totalStockOuts: number;
}

export function DashboardStats({
  totalProducts,
  totalWeight,
  totalStockIns,
  totalStockOuts,
}: DashboardStatsProps) {
  const stats = [
    {
      title: "کل محصولات",
      value: totalProducts,
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "وزن کل (کیلوگرم)",
      value: totalWeight.toFixed(2),
      icon: Weight,
      color: "text-purple-600",
    },
    {
      title: "ورودی‌ها",
      value: totalStockIns,
      icon: TrendingUp,
      color: "text-green-600",
      action: {
        href: "/dashboard/movements",
        label: "ثبت حرکت",
      },
    },
    {
      title: "خروجی‌ها",
      value: totalStockOuts,
      icon: TrendingDown,
      color: "text-orange-600",
      action: {
        href: "/dashboard/movements",
        label: "ثبت حرکت",
      },
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className={`size-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              {stat.action && (
                <Link href={stat.action.href} className="mt-3 inline-block">
                  <Button size="sm" variant="outline">
                    {stat.action.label}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-5 rounded-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
