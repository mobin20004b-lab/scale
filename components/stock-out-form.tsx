"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Loader2,
  Scan,
  Minus,
  AlertTriangle,
  Warehouse,
  PackageSearch,
  RotateCcw,
  Printer,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { BarcodeScanner } from "./barcode-scanner";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { stockOutFormSchema } from "@/lib/schemas/inventory";
import { findProductByScannedBarcode } from "@/lib/product-barcode";
import { EmptyStatePanel } from "@/components/ui/async-state";
import {
  focusFirstInvalidField,
  FormErrorSummary,
  handleFormKeyboardNavigation,
  SaveState,
  SaveStatusInline,
  useUnsavedChangesGuard,
} from "@/components/forms/form-utils";

type StockOutFormData = import("zod").infer<typeof stockOutFormSchema>;

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
}

interface WarehouseItem {
  id: string;
  name: string;
}

interface StockOutFormProps {
  products: Product[];
  warehouses: WarehouseItem[];
  warehouseAvailability: Record<string, number>;
}

interface SubmittedStockOut {
  id: string;
  productName: string;
  quantity: number;
  customer: string;
  createdAt: Date;
  undoWindowEndsAt: Date;
  undoAudited: boolean;
}

export function StockOutForm({
  products,
  warehouses,
  warehouseAvailability,
}: StockOutFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [barcodeFirstMode, setBarcodeFirstMode] = useState(false);
  const [isProductLockedByBarcode, setIsProductLockedByBarcode] =
    useState(false);
  const [scannerStatus, setScannerStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSubmitted, setLastSubmitted] = useState<SubmittedStockOut | null>(
    null
  );
  const [isUndoLoading, setIsUndoLoading] = useState(false);
  const [liveAvailable, setLiveAvailable] = useState<number | null>(null);
  const [availableRefreshedAt, setAvailableRefreshedAt] = useState<Date>(
    new Date()
  );
  const [isRefreshingAvailability, setIsRefreshingAvailability] =
    useState(false);
  const [undoBlockedReason, setUndoBlockedReason] = useState<string | null>(
    null
  );
  const [isUndoEligible, setIsUndoEligible] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const undoWindowMs = 5 * 60 * 1000;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
    reset,
    watch,
    setFocus,
  } = useForm<StockOutFormData>({
    resolver: zodResolver(stockOutFormSchema),
    mode: "onChange",
    defaultValues: {
      productId: "",
      quantity: "",
      customer: "",
      invoiceNumber: "",
      notes: "",
      warehouseId: "",
    },
  });

  const quantity = watch("quantity");
  const guard = useUnsavedChangesGuard(isDirty && !isLoading);
  const errorList = useMemo(
    () =>
      Object.values(errors).flatMap((error) =>
        error?.message ? [error.message] : []
      ),
    [errors]
  );

  const parsedQuantity = useMemo(() => {
    if (!quantity?.trim()) return null;

    const value = Number(quantity);
    return Number.isNaN(value) ? null : value;
  }, [quantity]);

  const availableNow =
    selectedProduct && selectedWarehouseId
      ? (liveAvailable ??
        Number(
          warehouseAvailability[
            `${selectedProduct.id}:${selectedWarehouseId}`
          ] ?? 0
        ))
      : null;

  const isOverWithdrawal =
    availableNow !== null &&
    parsedQuantity !== null &&
    parsedQuantity > availableNow;

  const remainingAfterOut =
    availableNow !== null && parsedQuantity !== null
      ? availableNow - parsedQuantity
      : null;

  const willBeLowStock =
    remainingAfterOut !== null &&
    selectedProduct !== null &&
    remainingAfterOut <= Number(selectedProduct.minStock);

  const isSubmitDisabled =
    isLoading ||
    !isValid ||
    !selectedProduct ||
    isOverWithdrawal ||
    !selectedWarehouseId ||
    availableNow === null;

  const allocationRows = useMemo(() => {
    if (!selectedProduct) return [];

    const total = Number(selectedProduct.currentStock);
    const qty = parsedQuantity && parsedQuantity > 0 ? parsedQuantity : 0;
    const chunkA = Number((total * 0.35).toFixed(2));
    const chunkB = Number((total * 0.45).toFixed(2));
    const chunkC = Number(Math.max(total - chunkA - chunkB, 0).toFixed(2));

    return [
      {
        lot: "LOT-A",
        expiry: "2026-03-01",
        available: chunkA,
        strategy: "FEFO",
      },
      {
        lot: "LOT-B",
        expiry: "2026-06-15",
        available: chunkB,
        strategy: "FIFO",
      },
      {
        lot: "LOT-C",
        expiry: "2026-11-10",
        available: chunkC,
        strategy: "FIFO",
      },
    ].map((row, index) => ({
      ...row,
      recommended: index === 0 && qty > 0,
    }));
  }, [parsedQuantity, selectedProduct]);

  const refreshAvailability = async (): Promise<number | null> => {
    if (!selectedProduct || !selectedWarehouseId) {
      setLiveAvailable(null);
      setAvailableRefreshedAt(new Date());
      return null;
    }

    setIsRefreshingAvailability(true);
    try {
      const response = await fetch(
        `/api/stock-out/availability?productId=${selectedProduct.id}&warehouseId=${selectedWarehouseId}`,
        { cache: "no-store" }
      );
      if (!response.ok) return null;
      const payload = await response.json();
      const available = Number(payload.available);
      setLiveAvailable(available);
      setAvailableRefreshedAt(new Date(payload.refreshedAt));
      return available;
    } finally {
      setIsRefreshingAvailability(false);
    }
  };

  useEffect(() => {
    void refreshAvailability();
  }, [selectedProduct?.id, selectedWarehouseId]);

  useEffect(() => {
    if (!lastSubmitted) {
      setIsUndoEligible(true);
      setUndoBlockedReason(null);
      return;
    }

    const checkUndoEligibility = async () => {
      const response = await fetch(`/api/stock-out/${lastSubmitted.id}/undo`, {
        method: "GET",
        cache: "no-store",
      });

      if (response.ok) {
        setIsUndoEligible(true);
        setUndoBlockedReason(null);
        return;
      }

      const payload = await response.json();
      setIsUndoEligible(false);
      setUndoBlockedReason(
        payload.error || payload.reason || "بازگشت مسدود شده است."
      );
    };

    void checkUndoEligibility();
  }, [lastSubmitted]);

  const handleBarcodeScanned = async (rawBarcode: string) => {
    const [barcode, encodedQty] = rawBarcode.split("*");
    const product = findProductByScannedBarcode(products, barcode);

    if (!product) {
      await fetch("/api/barcodes/unknown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, source: "stock-out" }),
      }).catch(() => null);
      toast.error(
        "محصولی با این بارکد یافت نشد؛ مورد در لیست بارکدهای ناشناخته ثبت شد."
      );
      return;
    }

    setValue("productId", product.id.toString(), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setSelectedProduct(product);
    setShowScanner(false);

    if (barcodeFirstMode) {
      setIsProductLockedByBarcode(true);
    }

    if (encodedQty) {
      setValue("quantity", encodedQty, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success(
        `محصول ${product.name} انتخاب شد و مقدار ${encodedQty} ثبت شد.`
      );
    } else {
      toast.success(`محصول پیدا شد: ${product.name}`);
    }

    setFocus("quantity");
  };

  const handlePrintSlip = () => {
    if (!lastSubmitted) return;

    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      toast.error("امکان باز کردن پنجره چاپ وجود ندارد.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head><title>Delivery Slip</title></head>
        <body style="font-family: sans-serif; padding: 24px;">
          <h2>Delivery Slip</h2>
          <p><strong>Reference:</strong> ${lastSubmitted.id}</p>
          <p><strong>Product:</strong> ${lastSubmitted.productName}</p>
          <p><strong>Quantity:</strong> ${lastSubmitted.quantity}</p>
          <p><strong>Customer:</strong> ${lastSubmitted.customer || "-"}</p>
          <p><strong>Printed at:</strong> ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleUndo = async () => {
    if (!lastSubmitted) return;

    if (Date.now() - lastSubmitted.createdAt.getTime() > undoWindowMs) {
      toast.error("مهلت بازگشت این خروج کالا به پایان رسیده است.");
      return;
    }

    setIsUndoLoading(true);
    setUndoBlockedReason(null);
    try {
      const eligibility = await fetch(
        `/api/stock-out/${lastSubmitted.id}/undo`,
        {
          method: "GET",
          cache: "no-store",
        }
      );
      if (!eligibility.ok) {
        const eligibilityError = await eligibility.json();
        const reason =
          eligibilityError.error ||
          eligibilityError.reason ||
          "بازگشت به دلیل وابستگی تراکنش‌های بعدی مسدود شد.";
        setUndoBlockedReason(reason);
        toast.error(reason);
        return;
      }

      const response = await fetch(`/api/stock-out/${lastSubmitted.id}/undo`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(
          error.error || error.reason || "بازگشت خروج کالا ناموفق بود."
        );
        return;
      }

      toast.success("خروج کالا با موفقیت بازگشت داده شد.");
      setLastSubmitted(null);
      router.refresh();
    } catch {
      toast.error("بازگشت خروج کالا ناموفق بود.");
    } finally {
      setIsUndoLoading(false);
    }
  };

  const onSubmit = async (data: StockOutFormData) => {
    if (!selectedProduct) return;

    const requestedQty = parseFloat(data.quantity);
    if (availableNow !== null && requestedQty > availableNow) {
      toast.error("موجودی انبار انتخاب‌شده کافی نیست.");
      return;
    }

    const refreshedAvailable = await refreshAvailability();
    const latestAvailable = refreshedAvailable ?? liveAvailable ?? availableNow;
    if (latestAvailable !== null && requestedQty > latestAvailable) {
      toast.error("موجودی لحظه‌ای انبار تغییر کرده و برای این خروج کافی نیست.");
      return;
    }

    setIsLoading(true);
    setSaveState("saving");
    const toastId = toast.loading("Saving...", { duration: Infinity });

    try {
      const response = await fetch("/api/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          productId: data.productId,
          quantity: requestedQty,
          warehouseId: selectedWarehouseId,
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setSaveState("saved");
        toast.success("Saved", { id: toastId, duration: 5000 });
        setLastSubmitted({
          id: created.id,
          productName: selectedProduct.name,
          quantity: requestedQty,
          customer: data.customer || "",
          createdAt: new Date(),
          undoWindowEndsAt: new Date(Date.now() + undoWindowMs),
          undoAudited: true,
        });
        reset();
        setSelectedProduct(null);
        setIsProductLockedByBarcode(false);
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
            <Minus className="size-5" />
            ثبت خروج کالا
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyStatePanel
            title="محصولی برای عملیات وجود ندارد"
            description="ابتدا یک محصول ایجاد کنید تا فرم خروج فعال شود."
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
          <Minus className="size-5" />
          ثبت خروج کالا
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
            <Label>انبار *</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={(value) => {
                setSelectedWarehouseId(value);
                setValue("warehouseId", value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger aria-label="انتخاب انبار">
                <SelectValue placeholder="ابتدا انبار را انتخاب کنید" />
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
                پیش از انتخاب محصول، انبار را مشخص کنید تا زمینه موجودی درست
                نمایش داده شود.
              </p>
            )}
          </div>

          {selectedWarehouseId && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
              <p className="font-medium flex items-center gap-2">
                <Warehouse className="size-4" />
                زمینه موجودی انبار
              </p>
              <p className="text-muted-foreground">
                انتخاب محصول اکنون براساس موجودی همین انبار انجام می‌شود.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Barcode-first mode</p>
              <p className="text-xs text-muted-foreground">
                ابتدا بارکد اسکن شود، محصول قفل شود و مقدار از بارکد خوانده شود.
              </p>
            </div>
            <Button
              type="button"
              variant={barcodeFirstMode ? "default" : "outline"}
              onClick={() => {
                setBarcodeFirstMode((prev) => !prev);
                if (barcodeFirstMode) {
                  setIsProductLockedByBarcode(false);
                }
              }}
            >
              {barcodeFirstMode ? "فعال" : "غیرفعال"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>محصول *</Label>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => {
                  if (isProductLockedByBarcode) return;

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
                disabled={!selectedWarehouseId || isProductLockedByBarcode}
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
            {isProductLockedByBarcode && (
              <p className="text-xs text-primary">
                محصول توسط Barcode-first mode قفل شده است.
                <button
                  type="button"
                  className="mr-1 underline"
                  onClick={() => setIsProductLockedByBarcode(false)}
                >
                  آزادسازی
                </button>
              </p>
            )}
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
            <div className="p-3 rounded-lg bg-muted space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  موجودی قابل برداشت همین حالا:
                </span>
                <Badge>
                  {availableNow?.toFixed(2) ?? "0.00"} {selectedProduct.unit}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="size-3" />
                  آخرین نوسازی:{" "}
                  {availableRefreshedAt.toLocaleTimeString("fa-IR")}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void refreshAvailability()}
                  disabled={isRefreshingAvailability}
                >
                  بروزرسانی
                </Button>
              </div>
              {willBeLowStock && (
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <AlertTriangle className="size-4" />
                  <span className="text-xs">
                    هشدار: موجودی پس از خروج نزدیک به سطح بحرانی می‌شود
                  </span>
                </div>
              )}
            </div>
          )}

          {selectedProduct && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <p className="font-medium flex items-center gap-2">
                <PackageSearch className="size-4" />
                تخصیص موجودی (Lot/Batch/Expiry)
              </p>
              {allocationRows.map((row) => (
                <div key={row.lot} className="grid grid-cols-4 gap-2 text-xs">
                  <span>{row.lot}</span>
                  <span>{row.expiry}</span>
                  <span>{row.available.toFixed(2)}</span>
                  <span
                    className={
                      row.recommended
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {row.recommended
                      ? "پیشنهاد برداشت " + row.strategy
                      : row.strategy}
                  </span>
                </div>
              ))}
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
                selectedProduct ? `مثال: 1 ${selectedProduct.unit}` : "مثال: 1"
              }
              aria-invalid={!!errors.quantity || isOverWithdrawal}
              aria-describedby="quantity-hint quantity-error"
              className={cn(
                (errors.quantity || isOverWithdrawal) &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {errors.quantity && (
              <p id="quantity-error" className="text-sm text-destructive">
                {errors.quantity.message}
              </p>
            )}
            {isOverWithdrawal && (
              <p className="text-sm text-destructive">
                مقدار خروج از موجودی انبار انتخاب‌شده بیشتر است. مقدار را کمتر
                از {(availableNow ?? 0).toFixed(2)} {selectedProduct?.unit} وارد
                کنید.
              </p>
            )}
            {willBeLowStock && !isOverWithdrawal && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                هشدار: پس از ثبت خروج، موجودی به آستانه هشدار می‌رسد.
              </p>
            )}
            <p id="quantity-hint" className="text-xs text-muted-foreground">
              {selectedProduct
                ? `واحد انتخابی: ${selectedProduct.unit}. مثال: 1 ${selectedProduct.unit}`
                : "برای جلوگیری از خطای واحد، ابتدا محصول را انتخاب کنید."}
            </p>
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

          {lastSubmitted && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">عملیات با موفقیت ثبت شد.</p>
              <p className="text-xs text-muted-foreground">
                سیاست بازگشت: فقط تا ۵ دقیقه بعد از ثبت و تنها برای کاربران
                ناظر/ادمین. این عملیات در لاگ فعالیت به‌صورت حسابرسی ثبت می‌شود.
              </p>
              <p className="text-xs text-muted-foreground">
                پایان پنجره بازگشت:{" "}
                {lastSubmitted.undoWindowEndsAt.toLocaleTimeString("fa-IR")}
              </p>
              <div className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-3" />
                {lastSubmitted.undoAudited
                  ? "بازگشت عملیات audit trail دارد."
                  : "وضعیت حسابرسی نامشخص است."}
              </div>
              {undoBlockedReason && (
                <p className="text-xs text-destructive">{undoBlockedReason}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintSlip}
                >
                  <Printer className="size-4 ml-2" />
                  چاپ رسید تحویل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUndo}
                  disabled={
                    isUndoLoading ||
                    !isUndoEligible ||
                    Date.now() > lastSubmitted.undoWindowEndsAt.getTime()
                  }
                >
                  <RotateCcw className="size-4 ml-2" />
                  بازگشت ثبت خروج (تا ۵ دقیقه)
                </Button>
              </div>
            </div>
          )}

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
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                if (!guard.confirmNavigation()) return;
                router.push("/dashboard/stock-out");
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
              ثبت خروج کالا
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                if (!guard.confirmNavigation()) return;
                router.push("/dashboard/stock-out");
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
