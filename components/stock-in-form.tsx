"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Loader2, RefreshCcw, Scan, Plus, TriangleAlert } from "lucide-react";
import { BarcodeScanner } from "./barcode-scanner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { stockInFormSchema } from "@/lib/schemas/inventory";
import { formatScaleWeight } from "@/lib/scale-reading";
import { useScaleLiveChannel } from "@/hooks/use-scale-live-channel";
import { EmptyStatePanel } from "@/components/ui/async-state";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type StockInFormData = import("zod").infer<typeof stockInFormSchema>;

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  unit: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Scale {
  id: string;
  name: string;
  warehouseId: string;
  tare: number;
  unit: string;
  precision: number;
}

interface StockInFormProps {
  products: Product[];
  warehouses: Warehouse[];
  scales: Scale[];
}

export function StockInForm({
  products,
  warehouses,
  scales,
}: StockInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedScaleId, setSelectedScaleId] = useState<string>("");
  const [liveWeight, setLiveWeight] = useState<number | null>(null);
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
    setFocus,
  } = useForm<StockInFormData>({
    resolver: zodResolver(stockInFormSchema),
    mode: "onChange",
    defaultValues: {
      productId: "",
      quantity: "",
      supplier: "",
      invoiceNumber: "",
      notes: "",
    },
  });

  const productId = watch("productId");

  const filteredScales = useMemo(
    () => scales.filter((scale) => scale.warehouseId === selectedWarehouseId),
    [scales, selectedWarehouseId]
  );

  const selectedScale = useMemo(
    () => scales.find((scale) => scale.id === selectedScaleId) ?? null,
    [scales, selectedScaleId]
  );

  const {
    scales: liveScaleMap,
    isConnecting: isFetchingWeight,
    error: weightError,
    isStale,
  } = useScaleLiveChannel(selectedScaleId ? [selectedScaleId] : []);

  useEffect(() => {
    if (!selectedScaleId) {
      setLiveWeight(null);
      return;
    }

    const liveScale = liveScaleMap[selectedScaleId];
    setLiveWeight(liveScale?.lastWeight ?? null);
  }, [liveScaleMap, selectedScaleId]);

  useEffect(() => {
    const presetProductId = searchParams.get("productId");

    if (!presetProductId) return;

    const product = products.find((p) => p.id === presetProductId);
    if (!product) return;

    setValue("productId", product.id, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setSelectedProduct(product);
  }, [products, searchParams, setValue]);

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
      setFocus("quantity");
    } else {
      toast.error("محصولی با این بارکد یافت نشد");
    }
  };

  const onSubmit = async (data: StockInFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          productId: data.productId,
          quantity: parseFloat(data.quantity),
          warehouseId: selectedWarehouseId || null,
          scaleId: selectedScaleId || null,
          scaleWeight: liveWeight,
        }),
      });

      if (response.ok) {
        toast.success("ورود کالا با موفقیت ثبت شد");
        reset();
        setSelectedProduct(null);
        setSelectedWarehouseId("");
        setSelectedScaleId("");
        setLiveWeight(null);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || "خطا در ثبت ورود کالا");
      }
    } catch {
      toast.error("خطا در ثبت ورود کالا");
    } finally {
      setIsLoading(false);
    }
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            ثبت ورود کالا
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyStatePanel
            title="محصولی برای ثبت ورود وجود ندارد"
            description="ابتدا محصول جدید ثبت کنید تا فرم ورود فعال شود."
            className="p-6"
          />
        </CardContent>
      </Card>
    );
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
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 pb-28 md:pb-0"
        >
          <div className="space-y-2">
            <Label>انبار</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={(value) => {
                setSelectedWarehouseId(value);
                setSelectedScaleId("");
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
            <Select
              value={selectedScaleId}
              onValueChange={setSelectedScaleId}
              disabled={!selectedWarehouseId}
            >
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

          {selectedWarehouseId && filteredScales.length === 0 && (
            <Empty className="p-4">
              <EmptyHeader>
                <EmptyTitle className="text-base">
                  ترازوی فعالی برای این انبار ثبت نشده است
                </EmptyTitle>
                <EmptyDescription>
                  برای ثبت وزن، ابتدا از بخش مدیریت ترازو یک ترازو اضافه یا فعال
                  کنید.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {selectedScaleId && (
            <div className="space-y-3">
              {isFetchingWeight && <Skeleton className="h-14 w-full" />}

              {isStale && !weightError && (
                <EmptyDescription>داده زنده ترازو موقتاً قدیمی شده است.</EmptyDescription>
              )}
              {weightError && (
                <Empty className="gap-3 border border-destructive/40 bg-destructive/5 p-4">
                  <EmptyHeader className="max-w-full">
                    <EmptyMedia
                      variant="icon"
                      className="bg-destructive/10 text-destructive"
                    >
                      <TriangleAlert className="size-5" />
                    </EmptyMedia>
                    <EmptyTitle className="text-base">
                      خطا در دریافت وزن ترازو
                    </EmptyTitle>
                    <EmptyDescription>{weightError}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.refresh()}
                    >
                      <RefreshCcw className="size-4 ml-2" />
                      تلاش مجدد
                    </Button>
                  </EmptyContent>
                </Empty>
              )}

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div className="text-sm font-medium">
                  وزن زنده:{" "}
                  {liveWeight !== null
                    ? formatScaleWeight(liveWeight, selectedScale ?? {})
                    : "--"}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (liveWeight !== null) {
                      setValue("quantity", String(liveWeight), {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                >
                  استفاده از وزن ترازو
                </Button>
              </div>

              {selectedScale && (
                <div className="text-xs text-muted-foreground">
                  تار: {selectedScale.tare} · دقت: {selectedScale.precision} ·
                  واحد: {selectedScale.unit}
                </div>
              )}
            </div>
          )}

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
                    (p) => p.id.toString() === value
                  );
                  setSelectedProduct(product || null);
                }}
                value={selectedProduct?.id.toString()}
              >
                <SelectTrigger
                  aria-label="انتخاب محصول"
                  className={cn(
                    errors.productId &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                >
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
              className="text-xs text-center text-muted-foreground mb-2"
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
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">
                <span className="font-medium">واحد:</span>{" "}
                {selectedProduct.unit}
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
              placeholder={
                selectedProduct ? `به ${selectedProduct.unit}` : "مقدار"
              }
              aria-invalid={!!errors.quantity}
              className={cn(
                errors.quantity &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">
                {errors.quantity.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedProduct
                ? `واحد انتخابی: ${selectedProduct.unit}. مثال: 2.5 ${selectedProduct.unit}`
                : "پس از انتخاب محصول، واحد و مثال ورود مقدار نمایش داده می‌شود."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">تامین‌کننده</Label>
            <Input
              id="supplier"
              {...register("supplier")}
              disabled={isLoading}
              dir="rtl"
              placeholder="نام تامین‌کننده"
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
              disabled={isLoading || !isValid || !productId}
              className="w-full"
              aria-busy={isLoading}
            >
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              ثبت ورود کالا
            </Button>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
            <Button
              type="submit"
              disabled={isLoading || !isValid || !productId}
              className="w-full"
              aria-busy={isLoading}
            >
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              ثبت ورود کالا
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
