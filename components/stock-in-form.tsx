"use client";

import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useScaleLive } from "@/hooks/use-scale-live";
import { getDisplayWeight } from "@/lib/scale-reading";

interface Product {
  id: string;
  name: string;
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
  tare: number | null;
  unit: string | null;
  precision: number | null;
}

export function StockInForm({
  products,
  warehouses,
  scales,
}: {
  products: Product[];
  warehouses: Warehouse[];
  scales: Scale[];
}) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [mode, setMode] = useState<"manual" | "scale">("manual");
  const [selectedScaleId, setSelectedScaleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );
  const availableScales = useMemo(
    () =>
      scales.filter(
        (scale) => !warehouseId || scale.warehouseId === warehouseId
      ),
    [scales, warehouseId]
  );
  const selectedScale = useMemo(
    () => availableScales.find((scale) => scale.id === selectedScaleId) ?? null,
    [availableScales, selectedScaleId]
  );

  const { scales: liveScales } = useScaleLive(
    availableScales.map((scale) => scale.id)
  );
  const selectedScaleLive = selectedScale ? liveScales[selectedScale.id] : null;
  const selectedScaleRawWeight = selectedScaleLive?.lastWeight ?? null;
  const selectedScaleNetWeight = selectedScale
    ? getDisplayWeight(selectedScaleRawWeight, {
        tare: selectedScale.tare,
        precision: selectedScale.precision,
        unit: selectedScale.unit,
      })
    : null;

  const applyScaleWeight = () => {
    if (selectedScaleNetWeight === null || selectedScaleNetWeight <= 0) {
      toast.error("وزن معتبری از ترازو دریافت نشد.");
      return;
    }
    const precision = Number.isFinite(selectedScale?.precision)
      ? Math.max(0, Math.min(4, Number(selectedScale?.precision)))
      : 2;
    setQuantity(selectedScaleNetWeight.toFixed(precision));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const qty = Number(quantity);
    if (!productId || !warehouseId || !Number.isFinite(qty) || qty <= 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: qty,
          scaleId: mode === "scale" ? selectedScaleId || undefined : undefined,
          scaleWeight: mode === "scale" ? selectedScaleRawWeight : undefined,
          captureSource: mode === "scale" ? "current" : "manual",
          sourceScaleId:
            mode === "scale" ? selectedScaleId || undefined : undefined,
          capturedAt:
            mode === "scale" && selectedScaleLive?.lastWeightAt
              ? new Date(selectedScaleLive.lastWeightAt).toISOString()
              : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "ثبت ورود ناموفق بود.");
        return;
      }
      toast.success("ورود کالا ثبت شد.");
      setQuantity("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5" />
          ثبت ورود کالا
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>منبع وزن *</Label>
            <Select
              value={mode}
              onValueChange={(value: "manual" | "scale") => {
                setMode(value);
                if (value === "manual") {
                  setSelectedScaleId("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب منبع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">ورود دستی</SelectItem>
                <SelectItem value="scale">خواندن از ترازو</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>انبار *</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب انبار" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>محصول *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب محصول" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode === "scale" && (
            <div className="space-y-2">
              <Label>ترازو *</Label>
              <Select
                value={selectedScaleId}
                onValueChange={setSelectedScaleId}
                disabled={availableScales.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      availableScales.length > 0
                        ? "انتخاب ترازو"
                        : "ترازوی فعالی برای این انبار یافت نشد"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableScales.map((scale) => (
                    <SelectItem key={scale.id} value={scale.id}>
                      {scale.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                وزن فعلی:{" "}
                {selectedScaleNetWeight === null
                  ? "بدون داده"
                  : `${selectedScaleNetWeight.toFixed(Number.isFinite(selectedScale?.precision) ? Math.max(0, Math.min(4, Number(selectedScale?.precision))) : 2)} ${selectedScale?.unit ?? "گرم"}`}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={applyScaleWeight}
                disabled={
                  !selectedScaleId ||
                  selectedScaleNetWeight === null ||
                  selectedScaleNetWeight <= 0
                }
              >
                انتقال وزن ترازو به مقدار
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="quantity">مقدار *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={
                selectedProduct ? `مثال: 1 ${selectedProduct.unit}` : "مثال: 1"
              }
              dir="ltr"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || (mode === "scale" && !selectedScaleId)}
          >
            {isSubmitting && <Loader2 className="ml-2 size-4 animate-spin" />}
            ثبت ورود کالا
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
