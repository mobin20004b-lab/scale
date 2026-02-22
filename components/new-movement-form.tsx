"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { findProductByScannedBarcode } from "@/lib/product-barcode";
import { stockInFormSchema, stockOutFormSchema } from "@/lib/schemas/inventory";
import { handleFormKeyboardNavigation } from "@/components/forms/form-utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import {
  CheckCircle2,
  ScanLine,
  ArrowDownToLine,
  ArrowUpFromLine,
  Printer,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

type MovementMode = "stock-in" | "stock-out";

interface Product {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  barcodes: { code: string }[];
}

interface Warehouse {
  id: string;
  name: string;
}

interface ScaleDevice {
  id: string;
  name: string;
  warehouseId: string;
}

interface MovementFormProps {
  products: Product[];
  warehouses: Warehouse[];
  scales: ScaleDevice[];
  inventoryByWarehouse: Record<string, number>;
}

const DUPLICATE_SCAN_DEBOUNCE_MS = 1200;

export function NewMovementForm({
  products,
  warehouses,
  scales,
  inventoryByWarehouse,
}: MovementFormProps) {
  const router = useRouter();
  const scannerRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ code: string; timestamp: number } | null>(null);
  const lastUnknownScanRef = useRef<{ code: string; timestamp: number } | null>(
    null
  );
  const [mode, setMode] = useState<MovementMode>("stock-in");
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [supplier, setSupplier] = useState("");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerStatus, setScannerStatus] = useState<
    "idle" | "success" | "unknown" | "duplicate" | "error"
  >("idle");
  const [receipt, setReceipt] = useState<{
    id: string;
    mode: MovementMode;
    productName: string;
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    before: number;
    after: number;
  } | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );

  const qty = Number(quantity);
  const normalizedQty = Number.isFinite(qty) ? qty : 0;

  const validationResult = useMemo(() => {
    const baseValues = {
      productId,
      quantity,
      notes,
      invoiceNumber: "",
      warehouseId,
      customer,
      supplier,
    };

    if (mode === "stock-in") {
      return stockInFormSchema.safeParse(baseValues);
    }

    return stockOutFormSchema.safeParse(baseValues);
  }, [customer, mode, notes, productId, quantity, supplier, warehouseId]);

  const warehouseKey =
    selectedProduct && warehouseId ? `${selectedProduct.id}:${warehouseId}` : "";
  const availableInWarehouse = warehouseKey
    ? (inventoryByWarehouse[warehouseKey] ?? 0)
    : 0;

  const before =
    mode === "stock-in"
      ? Number(selectedProduct?.currentStock ?? 0)
      : availableInWarehouse;
  const after =
    mode === "stock-in" ? before + normalizedQty : before - normalizedQty;

  const canSubmit =
    !isSubmitting &&
    validationResult.success &&
    !!selectedProduct &&
    !!warehouseId &&
    normalizedQty > 0 &&
    (mode === "stock-in" || normalizedQty <= availableInWarehouse);

  const resetForNextItem = () => {
    setProductId("");
    setQuantity("");
    setSupplier("");
    setCustomer("");
    setNotes("");
    setScannerInput("");
    requestAnimationFrame(() => scannerRef.current?.focus());
  };

  const onScan = async (overrideCode?: string) => {
    const barcode = (overrideCode ?? scannerInput).trim();
    if (!barcode) return;

    const normalizedBarcode = barcode.toLowerCase();
    const now = Date.now();

    if (
      lastScanRef.current &&
      lastScanRef.current.code === normalizedBarcode &&
      now - lastScanRef.current.timestamp < DUPLICATE_SCAN_DEBOUNCE_MS
    ) {
      setScannerStatus("duplicate");
      toast.warning("اسکن تکراری نادیده گرفته شد.");
      return;
    }

    lastScanRef.current = { code: normalizedBarcode, timestamp: now };

    const parsed = findProductByScannedBarcode(products as Product[], barcode);
    if (!parsed) {
      if (
        lastUnknownScanRef.current &&
        lastUnknownScanRef.current.code === normalizedBarcode &&
        now - lastUnknownScanRef.current.timestamp < DUPLICATE_SCAN_DEBOUNCE_MS
      ) {
        setScannerStatus("duplicate");
        toast.warning("بارکد ناشناس تکراری ثبت نشد.");
        return;
      }

      lastUnknownScanRef.current = { code: normalizedBarcode, timestamp: now };

      await fetch("/api/barcodes/unknown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, source: mode }),
      }).catch(() => null);
      setScannerStatus("unknown");
      toast.error("محصولی با این بارکد یافت نشد.");
      return;
    }

    setProductId(parsed.id);
    setScannerStatus("success");
    toast.success(`محصول ${parsed.name} انتخاب شد.`);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct || !warehouseId || !canSubmit) return;

    setIsSubmitting(true);
    try {
      const endpoint = mode === "stock-in" ? "/api/stock-in" : "/api/stock-out";
      const payload: Record<string, unknown> = {
        productId: selectedProduct.id,
        warehouseId,
        quantity: normalizedQty,
        notes: notes || undefined,
      };

      if (mode === "stock-in") {
        payload.supplier = supplier || undefined;
      } else {
        payload.customer = customer || undefined;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "عملیات ناموفق بود.");
        return;
      }

      const warehouseName =
        warehouses.find((w) => w.id === warehouseId)?.name ?? "-";
      setReceipt({
        id: data.id,
        mode,
        productName: selectedProduct.name,
        warehouseId,
        warehouseName,
        quantity: normalizedQty,
        before,
        after,
      });

      toast.success(
        mode === "stock-in" ? "ورود کالا ثبت شد." : "خروج کالا ثبت شد."
      );
      resetForNextItem();
      router.refresh();
    } catch {
      setScannerStatus("error");
      toast.error("خطا در ثبت عملیات.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const printLabelInBrowser = async () => {
    if (!receipt || receipt.mode !== "stock-in") return;

    const response = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "stock-in",
        stockInIds: [receipt.id],
        size: "50x30",
      }),
    });

    const data = (await response.json()) as { error?: string; html?: string };
    if (!response.ok || !data.html) {
      toast.error(data.error || "چاپ برچسب ناموفق بود.");
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=700");
    if (!printWindow) {
      toast.error("پنجره چاپ توسط مرورگر مسدود شد.");
      return;
    }

    printWindow.document.write(data.html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const printLabelViaEsp32 = async () => {
    if (!receipt || receipt.mode !== "stock-in") return;

    const scale = scales.find((item) => item.warehouseId === receipt.warehouseId);
    if (!scale) {
      toast.error("برای این انبار دستگاه ESP32 فعال پیدا نشد.");
      return;
    }

    const response = await fetch(`/api/scales/${scale.id}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "PRINT_LABEL",
        payload: {
          source: "stock-in",
          text: `${receipt.productName} | ${receipt.quantity}`,
          stockInId: receipt.id,
        },
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(data.error || "ارسال دستور چاپ به ESP32 ناموفق بود.");
      return;
    }

    toast.success(`فرمان چاپ به دستگاه ${scale.name} ارسال شد.`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>ثبت حرکت جدید</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label>حالت عملیات</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "stock-in" ? "default" : "outline"}
                onClick={() => setMode("stock-in")}
              >
                <ArrowDownToLine className="ml-2 size-4" /> ورود کالا
              </Button>
              <Button
                type="button"
                variant={mode === "stock-out" ? "default" : "outline"}
                onClick={() => setMode("stock-out")}
              >
                <ArrowUpFromLine className="ml-2 size-4" /> خروج کالا
              </Button>
            </div>
          </div>

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
            onKeyDown={(event) =>
              handleFormKeyboardNavigation(event, "#movement-scanner-input")
            }
          >
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">مرحله ۱: اسکن/انتخاب محصول</p>
              <div className="flex gap-2">
                <Input
                  id="movement-scanner-input"
                  ref={scannerRef}
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  placeholder="بارکد را اسکن کنید"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onScan();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={() => void onScan()}>
                  <ScanLine className="size-4" />
                </Button>
              </div>
              <BarcodeScanner
                onScan={(code) => {
                  setScannerInput(code);
                  void onScan(code);
                }}
              />
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="یا از لیست انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">مرحله ۲: انبار + مقدار</p>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
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

              {mode === "stock-out" && selectedProduct && warehouseId && (
                <div className="space-y-1 rounded-md border border-amber-300/70 bg-amber-50 p-2 text-xs text-amber-900">
                  <p className="font-medium">
                    موجودی قابل برداشت در این انبار: {availableInWarehouse.toFixed(2)} {selectedProduct.unit}
                  </p>
                  {normalizedQty > availableInWarehouse && (
                    <p className="flex items-center gap-1 text-destructive">
                      <ShieldAlert className="size-3.5" />
                      مقدار خروج بیشتر از موجودی انبار است.
                    </p>
                  )}
                </div>
              )}

              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="decimal"
                placeholder={`مقدار (${selectedProduct?.unit ?? "واحد"})`}
              />

              {mode === "stock-in" ? (
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="تامین‌کننده (اختیاری)"
                />
              ) : (
                <Input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="مشتری (اختیاری)"
                />
              )}
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات (اختیاری)"
              />
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">مرحله ۳: تایید</p>
              <div className="text-sm text-muted-foreground">
                پیشنمایش تغییر موجودی: {before.toFixed(2)} →{" "}
                <span className={cn(after < 0 && "text-destructive")}>
                  {after.toFixed(2)}
                </span>
              </div>
              {mode === "stock-out" && after < 0 && (
                <p className="text-xs text-destructive">
                  مقدار خروج از موجودی انبار بیشتر است.
                </p>
              )}
              {!validationResult.success && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="size-3.5" />
                  {validationResult.error.issues[0]?.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                میانبرها: Alt+B برای فوکوس روی اسکنر، Ctrl+Enter برای ثبت سریع.
              </p>
              <Button type="submit" disabled={!canSubmit} className="w-full">
                <CheckCircle2 className="ml-2 size-4" /> ثبت و آماده آیتم بعدی
                (Enter)
              </Button>
            </div>
          </form>

          <p className="sr-only" aria-live="polite" id="scanner-status-live">
            {scannerStatus === "success" && "بارکد با موفقیت خوانده شد."}
            {scannerStatus === "unknown" && "بارکد ناشناس ثبت شد."}
            {scannerStatus === "duplicate" && "اسکن تکراری نادیده گرفته شد."}
            {scannerStatus === "error" && "خطا در خواندن بارکد."}
            {scannerStatus === "idle" && "اسکنر آماده دریافت بارکد است."}
          </p>
        </CardContent>
      </Card>

      {receipt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">رسید کوتاه عملیات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge variant="secondary">
              {receipt.mode === "stock-in" ? "ورود" : "خروج"}
            </Badge>
            <p>محصول: {receipt.productName}</p>
            <p>انبار: {receipt.warehouseName}</p>
            <p>مقدار: {receipt.quantity}</p>
            <p>
              تغییر موجودی: {receipt.before.toFixed(2)} →{" "}
              {receipt.after.toFixed(2)}
            </p>
            {receipt.mode === "stock-in" && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={printLabelInBrowser}>
                  <Printer className="ml-2 size-4" /> چاپ در مرورگر
                </Button>
                <Button variant="secondary" size="sm" onClick={printLabelViaEsp32}>
                  <Printer className="ml-2 size-4" /> چاپ با ESP32
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
