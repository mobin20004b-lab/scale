"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DateTimeText } from "@/components/date-time-text";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyStatePanel } from "@/components/ui/async-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface StockIn {
  id: string;
  quantity: number;
  supplier: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
  product: {
    name: string;
    unit: string;
  };
  user: {
    full_name: string;
  };
}

interface StockOut {
  id: string;
  quantity: number;
  customer: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
  product: {
    name: string;
    unit: string;
  };
  user: {
    full_name: string;
  };
}

interface ReportsTableProps {
  stockIns: StockIn[];
  stockOuts: StockOut[];
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function ReportsTable({ stockIns, stockOuts }: ReportsTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const transactions = useMemo(
    () =>
      [
        ...stockIns.map((item) => ({
          id: `in-${item.id}`,
          type: "in" as const,
          product: item.product.name,
          unit: item.product.unit,
          quantity: Number(item.quantity),
          party: item.supplier || "-",
          reference: item.invoiceNumber || "-",
          user: item.user.full_name,
          date: new Date(item.createdAt),
        })),
        ...stockOuts.map((item) => ({
          id: `out-${item.id}`,
          type: "out" as const,
          product: item.product.name,
          unit: item.product.unit,
          quantity: Number(item.quantity),
          party: item.customer || "-",
          reference: item.invoiceNumber || "-",
          user: item.user.full_name,
          date: new Date(item.createdAt),
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [stockIns, stockOuts]
  );

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const rangeStart =
    transactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, transactions.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, transactions.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          جزئیات تراکنش‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            نمایش {rangeStart}–{rangeEnd} از {transactions.length}
          </span>
          <div className="flex items-center gap-2">
            <span>تعداد در صفحه</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg overflow-auto max-h-[65vh]">
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-20 bg-background">
                  تاریخ
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-background">
                  نوع
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-background">
                  محصول
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-background">
                  مقدار
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-background">
                  طرف معامله
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-background">
                  شماره مرجع
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-background">
                  کاربر
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12">
                    <EmptyStatePanel
                      title="تراکنشی با فیلترهای فعلی یافت نشد"
                      description="برای مشاهده داده‌ها، فیلترها را پاک کنید."
                      icon={<FileText className="size-5" />}
                      action={{
                        label: "پاک کردن فیلترها",
                        onClick: () => router.push("/dashboard/reports"),
                      }}
                      className="p-4"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="sticky left-0 z-10 bg-background">
                      <DateTimeText value={transaction.date} showTimeZone />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.type === "in" ? "default" : "secondary"
                        }
                      >
                        {transaction.type === "in" ? "ورودی" : "خروجی"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.product}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.type === "in" ? "+" : "-"}
                        {transaction.quantity.toFixed(2)} {transaction.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.party}</TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {transaction.reference}
                    </TableCell>
                    <TableCell>{transaction.user}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="space-y-3 p-3 md:hidden">
            {transactions.length === 0 ? (
              <EmptyStatePanel
                title="تراکنشی با فیلترهای فعلی یافت نشد"
                description="برای مشاهده داده‌ها، فیلترها را پاک کنید."
                icon={<FileText className="size-5" />}
                action={{
                  label: "پاک کردن فیلترها",
                  onClick: () => router.push("/dashboard/reports"),
                }}
                className="p-4"
              />
            ) : (
              paginatedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold">{transaction.product}</div>
                    <Badge
                      variant={
                        transaction.type === "in" ? "default" : "secondary"
                      }
                    >
                      {transaction.type === "in" ? "ورودی" : "خروجی"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <span className="text-muted-foreground">تاریخ</span>
                    <span>
                      <DateTimeText value={transaction.date} showTimeZone />
                    </span>
                    <span className="text-muted-foreground">مقدار</span>
                    <span>
                      <Badge variant="outline">
                        {transaction.type === "in" ? "+" : "-"}
                        {transaction.quantity.toFixed(2)} {transaction.unit}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground">طرف معامله</span>
                    <span>{transaction.party}</span>
                    <span className="text-muted-foreground">شماره مرجع</span>
                    <span dir="ltr" className="text-right">
                      {transaction.reference}
                    </span>
                    <span className="text-muted-foreground">کاربر</span>
                    <span>{transaction.user}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {transactions.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              قبلی
            </Button>
            <span className="text-sm text-muted-foreground">
              صفحه {currentPage} از {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              بعدی
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
