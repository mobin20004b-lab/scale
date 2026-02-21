"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Loader2, RefreshCcw, Scan, Plus, TriangleAlert, Info } from "lucide-react";
import { useScaleLive } from "@/hooks/use-scale-live";
import { BarcodeScanner } from "./barcode-scanner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { stockInFormSchema } from "@/lib/schemas/inventory";
import { formatScaleWeight } from "@/lib/scale-reading";
import { EmptyStatePanel } from "@/components/ui/async-state";
import {
  focusFirstInvalidField,
  FormErrorSummary,
  handleFormKeyboardNavigation,
  SaveState,
  SaveStatusInline,
  useUnsavedChangesGuard,
} from "@/components/forms/form-utils";
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
  currentStock: number;
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
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
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
      sourceDocumentType: "",
      sourceDocumentNumber: "",
      lotBatch: "",
      expiryDate: "",
      supplierLot: "",
      qualityResult: "",
      notes: "",
    },
  });

  const productId = watch("productId");
  const quantity = watch("quantity");
  const sourceDocumentType = watch("sourceDocumentType");
  const guard = useUnsavedChangesGuard(isDirty && !isLoading);
  const errorList = useMemo(
    () =>
      Object.values(errors).flatMap((error) =>
        error?.message ? [error.message] : []
      ),
    [errors]
  );

  const filteredScales = useMemo(
    () => scales.filter((scale) => scale.warehouseId === selectedWarehouseId),
    [scales, selectedWarehouseId]
  );

  const selectedScale = useMemo(
    () => scales.find((scale) => scale.id === selectedScaleId) ?? null,
    [scales, selectedScaleId]
  );

  const stockPreview = useMemo(() => {
    if (!selectedProduct) return null;

    const parsedQuantity = Number(quantity);
    const current = Number(selectedProduct.currentStock);

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return { current, after: current };
    }

    return { current, after: current + parsedQuantity };
  }, [quantity, selectedProduct]);

  const isSubmitDisabled =
    isLoading || !isValid || !productId || !selectedWarehouseId || !selectedScaleId;

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

  const {
    scales: liveScales,
    isConnecting: isFetchingWeight,
    isStale: isWeightStale,
    error: weightError,
    refresh: refreshWeight,
  } = useScaleLive(selectedScaleId ? [selectedScaleId] : []);

  useEffect(() => {
    if (!selectedScaleId) {
      setLiveWeight(null);
      return;
    }

    setLiveWeight(liveScales[selectedScaleId]?.lastWeight ?? null);
  }, [liveScales, selectedScaleId]);

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
    setSaveState("saving");
    const toastId = toast.loading("Saving...", { duration: Infinity });

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
        setSaveState("saved");
        toast.success("Saved", { id: toastId, duration: 5000 });
        reset();
        setSelectedProduct(null);
        setSelectedWarehouseId("");
        setSelectedScaleId("");
        setLiveWeight(null);
        router.refresh();
      } else {
        const error = await response.json();
        setSaveState("failed");
        toast.error(error.error || "Failed", { id: toastId, duration: 7000 });
      }
    } catch {
      setSaveState("failed");
      toast.error("Failed", { id: toastId, duration: 7000 });
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
          ref={formRef}
          onSubmit={handleSubmit(onSubmit, () =>
            focusFirstInvalidField(formRef.current)
          )}
          onKeyDown={(event) =>
            handleFormKeyboardNavigation(
              event,
              'button[aria-label="باز کردن اسکنر بارکد"]'
            )
          }
          className="space-y-4 pb-28 md:pb-0"
        >
          <FormErrorSummary errors={errorList} />
          <SaveStatusInline state={saveState} />
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
            {!selectedWarehouseId && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                برای جلوگیری از ثبت اشتباه، ابتدا انبار را انتخاب کنید.
              </p>
            )}
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
            {!selectedScaleId && selectedWarehouseId && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                انتخاب ترازو برای ثبت ورود الزامی است.
              </p>
            )}
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

              {(weightError || isWeightStale) && (
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
                    <EmptyDescription>
                      {weightError ||
                        "داده وزن به‌روز نیست. اتصال لحظه‌ای ممکن است ناپایدار باشد."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={refreshWeight}
                      aria-describedby="scale-status-live"
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

              <p
                className="sr-only"
                id="scale-status-live"
                role="status"
                aria-live="polite"
              >
                {liveWeight !== null
                  ? `وزن فعلی ${liveWeight}`
                  : "وزن قابل دریافت نیست"}
              </p>

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
              id="scanner-status-live"
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
                selectedProduct
                  ? `مثال: 2.5 ${selectedProduct.unit}`
                  : "مثال: 2.5"
              }
              aria-invalid={!!errors.quantity}
              aria-describedby="quantity-hint quantity-error"
              className={cn(
                errors.quantity &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {errors.quantity && (
              <p id="quantity-error" className="text-sm text-destructive">
                {errors.quantity.message}
              </p>
            )}
            <p id="quantity-hint" className="text-xs text-muted-foreground">
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
            <Label>نوع سند مبدا</Label>
            <Select
              value={sourceDocumentType || "none"}
              onValueChange={(value) => {
                setValue("sourceDocumentType", value === "none" ? "" : value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger aria-label="انتخاب نوع سند مبدا">
                <SelectValue placeholder="انتخاب نوع سند" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون سند</SelectItem>
                <SelectItem value="invoice">فاکتور</SelectItem>
                <SelectItem value="purchase-order">سفارش خرید</SelectItem>
                <SelectItem value="transfer-note">حواله انتقال</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceDocumentNumber">شماره سند مبدا</Label>
            <Input
              id="sourceDocumentNumber"
              {...register("sourceDocumentNumber")}
              disabled={isLoading}
              dir="ltr"
              placeholder="مثال: PO-1403-0082"
            />
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="size-4" />
              فیلدهای اختیاری دریافت
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lotBatch">لات / بچ</Label>
                <Input id="lotBatch" {...register("lotBatch")} placeholder="Lot-A12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">تاریخ انقضا</Label>
                <Input id="expiryDate" type="date" {...register("expiryDate")} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierLot">لات تامین‌کننده</Label>
                <Input id="supplierLot" {...register("supplierLot")} placeholder="SUP-LOT-44" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualityResult">نتیجه کنترل کیفیت</Label>
                <Input
                  id="qualityResult"
                  {...register("qualityResult")}
                  placeholder="قبول / مشروط / رد"
                />
              </div>
            </div>
          </div>

          {stockPreview && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <p>پیش‌نمایش موجودی</p>
              <p>
                موجودی فعلی: {stockPreview.current.toFixed(2)} {selectedProduct?.unit}
              </p>
              <p>
                پس از ورود: {stockPreview.after.toFixed(2)} {selectedProduct?.unit}
              </p>
            </div>
          )}

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
              ثبت ورود کالا
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                if (!guard.confirmNavigation()) return;
                router.push("/dashboard/stock-in");
              }}
            >
              انصراف
            </Button>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full"
              aria-busy={isLoading}
            >
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              ثبت ورود کالا
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                if (!guard.confirmNavigation()) return;
                router.push("/dashboard/stock-in");
              }}
            >
              انصراف
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
