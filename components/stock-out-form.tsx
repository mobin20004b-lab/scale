"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Scan, Minus, AlertTriangle } from "lucide-react";
import { BarcodeScanner } from "./barcode-scanner";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { stockOutFormSchema } from "@/lib/schemas/inventory";

type StockOutFormData = import("zod").infer<typeof stockOutFormSchema>;

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
}

interface StockOutFormProps {
  products: Product[];
}

export function StockOutForm({ products }: StockOutFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scannerStatus, setScannerStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    reset,
    watch,
  } = useForm<StockOutFormData>({
    resolver: zodResolver(stockOutFormSchema),
    mode: "onChange",
    defaultValues: {
      productId: "",
      quantity: "",
      customer: "",
      invoiceNumber: "",
      notes: "",
    },
  });

  const quantity = watch("quantity");

  const parsedQuantity = useMemo(() => {
    if (!quantity?.trim()) return null;

    const value = Number(quantity);
    return Number.isNaN(value) ? null : value;
  }, [quantity]);

  const isOverWithdrawal =
    selectedProduct !== null &&
    parsedQuantity !== null &&
    parsedQuantity > Number(selectedProduct.currentStock);

  const remainingAfterOut =
    selectedProduct !== null && parsedQuantity !== null
      ? Number(selectedProduct.currentStock) - parsedQuantity
      : null;

  const willBeLowStock =
    remainingAfterOut !== null &&
    selectedProduct !== null &&
    remainingAfterOut <= Number(selectedProduct.minStock);

  const isSubmitDisabled =
    isLoading || !isValid || !selectedProduct || isOverWithdrawal;

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      setValue("productId", product.id.toString(), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setSelectedProduct(product);
      setShowScanner(false);
      toast.success(`محصول پیدا شد: ${product.name}`);
    } else {
      toast.error("محصولی با این بارکد یافت نشد");
    }
  };

  const onSubmit = async (data: StockOutFormData) => {
    if (!selectedProduct) return;

    const requestedQty = parseFloat(data.quantity);
    if (requestedQty > Number(selectedProduct.currentStock)) {
      toast.error("موجودی کافی نیست");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          productId: data.productId,
          quantity: requestedQty,
        }),
      });

      if (response.ok) {
        toast.success("خروج کالا با موفقیت ثبت شد");
        reset();
        setSelectedProduct(null);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || "خطا در ثبت خروج کالا");
      }
    } catch (error) {
      toast.error("خطا در ثبت خروج کالا");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Minus className="size-5" />
          ثبت خروج کالا
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 pb-24 md:pb-0"
        >
          <div className="space-y-2">
            <Label>محصول *</Label>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => {
                  setValue("productId", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  const product = products.find(
                    (p) => p.id.toString() === value,
                  );
                  setSelectedProduct(product || null);
                }}
                value={selectedProduct?.id.toString()}
              >
                <SelectTrigger
                  aria-label="انتخاب محصول"
                  className={cn(
                    errors.productId &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                >
                  <SelectValue placeholder="محصول را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} ({Number(product.currentStock).toFixed(2)}{" "}
                      {product.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                onClick={() => setShowScanner(!showScanner)}
                aria-label={
                  showScanner ? "بستن اسکنر بارکد" : "باز کردن اسکنر بارکد"
                }
              >
                <Scan className="size-4" />
              </Button>
            </div>
            {errors.productId && (
              <p className="text-sm text-destructive">
                {errors.productId.message}
              </p>
            )}
          </div>

          {showScanner && (
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              onStatusChange={setScannerStatus}
            />
          )}

          {showScanner && (
            <p
              className="text-xs text-center text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {scannerStatus === "scanning" && "در حال اسکن..."}
              {scannerStatus === "success" && "بارکد با موفقیت خوانده شد."}
              {scannerStatus === "error" &&
                "اسکنر در دسترس نیست؛ دسترسی دوربین را بررسی کنید."}
              {scannerStatus === "idle" &&
                "برای اسکن بارکد، دوربین را فعال کنید."}
            </p>
          )}

          {selectedProduct && (
            <div className="p-3 rounded-lg bg-muted space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">موجودی فعلی:</span>
                <Badge>
                  {Number(selectedProduct.currentStock).toFixed(2)}{" "}
                  {selectedProduct.unit}
                </Badge>
              </div>
              {willBeLowStock && (
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <AlertTriangle className="size-4" />
                  <span className="text-xs">
                    هشدار: موجودی به سطح بحرانی می‌رسد
                  </span>
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
              placeholder={
                selectedProduct ? `به ${selectedProduct.unit}` : "مقدار"
              }
              aria-invalid={!!errors.quantity || isOverWithdrawal}
              className={cn(
                (errors.quantity || isOverWithdrawal) &&
                  "border-destructive focus-visible:ring-destructive",
              )}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">
                {errors.quantity.message}
              </p>
            )}
            {isOverWithdrawal && (
              <p className="text-sm text-destructive">
                مقدار خروج از موجودی فعلی بیشتر است. مقدار را کمتر از{" "}
                {Number(selectedProduct?.currentStock).toFixed(2)}{" "}
                {selectedProduct?.unit} وارد کنید.
              </p>
            )}
            {willBeLowStock && !isOverWithdrawal && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                هشدار: پس از ثبت خروج، موجودی به آستانه هشدار می‌رسد.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">نام مشتری</Label>
            <Input
              id="customer"
              {...register("customer")}
              disabled={isLoading}
              dir="rtl"
              placeholder="نام مشتری"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">شماره فاکتور</Label>
            <Input
              id="invoiceNumber"
              {...register("invoiceNumber")}
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

          <div className="hidden md:block">
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full"
              aria-busy={isLoading}
            >
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              ثبت خروج کالا
            </Button>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden">
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full"
              aria-busy={isLoading}
            >
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              ثبت خروج کالا
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
