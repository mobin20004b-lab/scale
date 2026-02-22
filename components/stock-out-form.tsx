"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Loader2, Minus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateTimeText } from "@/components/date-time-text";

interface Product { id: string; name: string; unit: string; }
interface WarehouseItem { id: string; name: string; }
interface EntryLot {
  id: string;
  lotBatch: string;
  quantity: number;
  weight: number;
  createdAt: string;
  capturedAt?: string | null;
  captureSource?: string | null;
  confidence?: number | null;
  stableWindowMs?: number | null;
  sourceScaleId?: string | null;
  user?: { full_name: string };
  scale?: { id: string; name: string } | null;
}

export function StockOutForm({ products, warehouses }: { products: Product[]; warehouses: WarehouseItem[]; warehouseAvailability: Record<string, number>; }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [selectedStockInIds, setSelectedStockInIds] = useState<string[]>([]);
  const [entryLots, setEntryLots] = useState<EntryLot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const selectedLots = useMemo(
    () => entryLots.filter((lot) => selectedStockInIds.includes(lot.id)),
    [entryLots, selectedStockInIds]
  );

  useEffect(() => {
    const load = async () => {
      if (!productId || !warehouseId) {
        setEntryLots([]);
        setSelectedStockInIds([]);
        return;
      }

      const response = await fetch(`/api/stock-out/availability?productId=${productId}&warehouseId=${warehouseId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "Failed loading entry lots");
        return;
      }
      setEntryLots(payload.entryLots || []);
      setSelectedStockInIds([]);
    };

    void load();
  }, [productId, warehouseId]);

  const toggleSelection = (lotId: string, checked: boolean) => {
    setSelectedStockInIds((previous) =>
      checked ? [...new Set([...previous, lotId])] : previous.filter((id) => id !== lotId)
    );
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productId || !warehouseId || selectedStockInIds.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, stockInIds: selectedStockInIds }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "ثبت خروج ناموفق بود.");
        return;
      }

      toast.success(`${payload.count ?? selectedStockInIds.length} خروج کالا ثبت شد.`);
      setSelectedStockInIds([]);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const totalSelectedQuantity = selectedLots.reduce((sum, lot) => sum + Number(lot.quantity), 0);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Minus className="size-5" />ثبت خروج کالا</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>انبار *</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder="انتخاب انبار" /></SelectTrigger>
              <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>محصول *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="انتخاب محصول" /></SelectTrigger>
              <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ورودی‌ها (لات) *</Label>
            <div className="rounded-lg border">
              <ScrollArea className="h-60 p-3">
                {entryLots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ورودی فعالی وجود ندارد</p>
                ) : (
                  <div className="space-y-2">
                    {entryLots.map((lot) => (
                      <label key={lot.id} className="block rounded-md border p-3 text-sm cursor-pointer hover:bg-muted/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">{lot.lotBatch}</p>
                            <p className="text-muted-foreground">{Number(lot.quantity).toFixed(2)} {selectedProduct?.unit ?? ""}</p>
                            <p className="text-xs text-muted-foreground">زمان ثبت: <DateTimeText value={lot.createdAt} showTimeZone /></p>
                            {lot.user?.full_name && <p className="text-xs text-muted-foreground">ثبت‌کننده: {lot.user.full_name}</p>}
                            {lot.scale?.name && <p className="text-xs text-muted-foreground">ترازو: {lot.scale.name}</p>}
                            {lot.captureSource && <p className="text-xs text-muted-foreground">منبع: {lot.captureSource}</p>}
                            {lot.confidence != null && <p className="text-xs text-muted-foreground">اطمینان: {(lot.confidence * 100).toFixed(0)}%</p>}
                          </div>
                          <Checkbox
                            checked={selectedStockInIds.includes(lot.id)}
                            onCheckedChange={(checked) => toggleSelection(lot.id, Boolean(checked))}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {selectedLots.length > 0 && <div className="rounded-lg border p-3 text-sm">{selectedLots.length} لات انتخاب شد <Badge variant="secondary" className="mx-1">{Number(totalSelectedQuantity).toFixed(2)} {selectedProduct?.unit ?? ""}</Badge></div>}

          <Button type="submit" className="w-full" disabled={selectedStockInIds.length === 0 || isLoading}>
            {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}ثبت خروج کالا
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
