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

interface Product { id: string; name: string; unit: string; }
interface WarehouseItem { id: string; name: string; }
interface EntryLot { id: string; lotBatch: string; quantity: number; createdAt: string; }

export function StockOutForm({ products, warehouses }: { products: Product[]; warehouses: WarehouseItem[]; warehouseAvailability: Record<string, number>; }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [stockInId, setStockInId] = useState("");
  const [entryLots, setEntryLots] = useState<EntryLot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const selectedLot = useMemo(() => entryLots.find((lot) => lot.id === stockInId), [entryLots, stockInId]);

  useEffect(() => {
    const load = async () => {
      if (!productId || !warehouseId) {
        setEntryLots([]);
        setStockInId("");
        return;
      }

      const response = await fetch(`/api/stock-out/availability?productId=${productId}&warehouseId=${warehouseId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "Failed loading entry lots");
        return;
      }
      setEntryLots(payload.entryLots || []);
      setStockInId("");
    };

    void load();
  }, [productId, warehouseId]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productId || !warehouseId || !stockInId) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, stockInId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "ثبت خروج ناموفق بود.");
        return;
      }

      toast.success("خروج کالا ثبت شد.");
      setStockInId("");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

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
            <Label>ورودی (لات) *</Label>
            <Select value={stockInId} onValueChange={setStockInId} disabled={!productId || !warehouseId || entryLots.length === 0}>
              <SelectTrigger><SelectValue placeholder={entryLots.length ? "انتخاب یک ورودی" : "ورودی فعالی وجود ندارد"} /></SelectTrigger>
              <SelectContent>
                {entryLots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.lotBatch} - {Number(lot.quantity).toFixed(2)} {selectedProduct?.unit ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLot && <div className="rounded-lg border p-3 text-sm">این خروج کل ورودی <Badge variant="secondary" className="mx-1">{selectedLot.lotBatch}</Badge> را ثبت می‌کند: {Number(selectedLot.quantity).toFixed(2)} {selectedProduct?.unit ?? ""}</div>}

          <Button type="submit" className="w-full" disabled={!stockInId || isLoading}>
            {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}ثبت خروج کالا
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
