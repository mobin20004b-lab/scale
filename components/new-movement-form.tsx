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
import {
  CheckCircle2,
  ScanLine,
  ArrowDownToLine,
  ArrowUpFromLine,
  Printer,
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

interface MovementFormProps {
  products: Product[];
  warehouses: Warehouse[];
  inventoryByWarehouse: Record<string, number>;
}

export function NewMovementForm({
  products,
  warehouses,
  inventoryByWarehouse,
}: MovementFormProps) {
  const router = useRouter();
  const scannerRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<MovementMode>("stock-in");
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [supplier, setSupplier] = useState("");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerInput, setScannerInput] = useState("");
  const [receipt, setReceipt] = useState<{
    id: string;
    mode: MovementMode;
    productName: string;
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
  const warehouseKey =
    selectedProduct && warehouseId
      ? `${selectedProduct.id}:${warehouseId}`
      : "";
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

  const onScan = async () => {
    const barcode = scannerInput.trim();
    if (!barcode) return;

    const parsed = findProductByScannedBarcode(products as any, barcode);
    if (!parsed) {
      await fetch("/api/barcodes/unknown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, source: mode }),
      }).catch(() => null);
      toast.error("محصولی با این بارکد یافت نشد.");
      return;
    }

    setProductId(parsed.id);
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
      toast.error("خطا در ثبت عملیات.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const printLabel = async () => {
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

    const data = await response.json();
    if (!response.ok || !data.url) {
      toast.error(data.error || "چاپ برچسب ناموفق بود.");
      return;
    }

    window.open(data.url, "_blank");
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">مرحله ۱: اسکن/انتخاب محصول</p>
              <div className="flex gap-2">
                <Input
                  ref={scannerRef}
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  placeholder="بارکد را اسکن کنید"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onScan();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={onScan}>
                  <ScanLine className="size-4" />
                </Button>
              </div>
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
                <p className="text-xs text-muted-foreground">
                  موجودی قابل برداشت در این انبار:{" "}
                  <strong>{availableInWarehouse.toFixed(2)}</strong>{" "}
                  {selectedProduct.unit}
                </p>
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
                پیش‌نمایش تغییر موجودی: {before.toFixed(2)} →{" "}
                <span className={cn(after < 0 && "text-destructive")}>
                  {after.toFixed(2)}
                </span>
              </div>
              {mode === "stock-out" && after < 0 && (
                <p className="text-xs text-destructive">
                  مقدار خروج از موجودی انبار بیشتر است.
                </p>
              )}
              <Button type="submit" disabled={!canSubmit} className="w-full">
                <CheckCircle2 className="ml-2 size-4" /> ثبت و آماده آیتم بعدی
                (Enter)
              </Button>
            </div>
          </form>
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
              <Button variant="outline" size="sm" onClick={printLabel}>
                <Printer className="ml-2 size-4" /> چاپ برچسب
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
