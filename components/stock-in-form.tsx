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

interface Product { id: string; name: string; unit: string; }
interface Warehouse { id: string; name: string; }

export function StockInForm({ products, warehouses }: { products: Product[]; warehouses: Warehouse[]; scales: unknown[]; }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const qty = Number(quantity);
    if (!productId || !warehouseId || !Number.isFinite(qty) || qty <= 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: qty }),
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
      <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5" />ثبت ورود کالا</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>انبار *</Label><Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger><SelectValue placeholder="انتخاب انبار" /></SelectTrigger><SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>محصول *</Label><Select value={productId} onValueChange={setProductId}><SelectTrigger><SelectValue placeholder="انتخاب محصول" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="quantity">مقدار *</Label><Input id="quantity" type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={selectedProduct ? `مثال: 1 ${selectedProduct.unit}` : "مثال: 1"} dir="ltr" /></div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="ml-2 size-4 animate-spin" />}ثبت ورود کالا</Button>
        </form>
      </CardContent>
    </Card>
  );
}
