"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Plus, Search, Trash2, WarehouseIcon } from "lucide-react";

interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  _count?: { scales: number; stockIns: number };
}

interface WarehouseManagerProps {
  warehouses: Warehouse[];
}

export function WarehouseManager({ warehouses }: WarehouseManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [localWarehouses, setLocalWarehouses] = useState(warehouses);
  const pendingDeletes = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(() => {
    setLocalWarehouses(warehouses);
  }, [warehouses]);

  useEffect(() => {
    return () => {
      Object.values(pendingDeletes.current).forEach(clearTimeout);
    };
  }, []);

  const filteredWarehouses = localWarehouses.filter((warehouse) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return (
      warehouse.name.toLowerCase().includes(keyword) ||
      warehouse.location?.toLowerCase().includes(keyword) ||
      warehouse.description?.toLowerCase().includes(keyword)
    );
  });

  const totalScales = localWarehouses.reduce(
    (sum, warehouse) => sum + (warehouse._count?.scales ?? 0),
    0,
  );

  const resetForm = () => {
    setName("");
    setLocation("");
    setDescription("");
    setEditing(null);
  };

  const submitWarehouse = async () => {
    try {
      const response = await fetch(
        editing ? `/api/warehouses/${editing.id}` : "/api/warehouses",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, location, description }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "خطا در ذخیره انبار");
      }

      toast.success(editing ? "انبار ویرایش شد" : "انبار ایجاد شد");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "خطا در ذخیره انبار");
    }
  };

  const executeDeleteWarehouse = async (warehouse: Warehouse) => {
    try {
      const response = await fetch(`/api/warehouses/${warehouse.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("خطا در حذف انبار");
      }
      toast.success("انبار حذف شد");
      router.refresh();
    } catch {
      setLocalWarehouses((previous) => [warehouse, ...previous]);
      toast.error("خطا در حذف انبار");
    }
  };

  const deleteWarehouse = (warehouse: Warehouse) => {
    setLocalWarehouses((previous) =>
      previous.filter((item) => item.id !== warehouse.id),
    );

    pendingDeletes.current[warehouse.id] = setTimeout(() => {
      delete pendingDeletes.current[warehouse.id];
      executeDeleteWarehouse(warehouse);
    }, 5000);

    toast("انبار برای حذف علامت‌گذاری شد", {
      description: "برای لغو حذف، تا ۵ ثانیه آینده بازگردانی را انتخاب کنید.",
      action: {
        label: "بازگردانی",
        onClick: () => {
          const timer = pendingDeletes.current[warehouse.id];
          if (timer) {
            clearTimeout(timer);
            delete pendingDeletes.current[warehouse.id];
            setLocalWarehouses((previous) => [warehouse, ...previous]);
            toast.success("حذف انبار لغو شد");
          }
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>مدیریت انبارها</CardTitle>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 ml-2" />
              افزودن انبار
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "ویرایش انبار" : "افزودن انبار"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>نام انبار</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>موقعیت</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button onClick={submitWarehouse} className="w-full">
                ذخیره
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">
              تعداد کل انبارها
            </div>
            <div className="text-lg font-semibold">
              {localWarehouses.length}
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">ترازوهای متصل</div>
            <div className="text-lg font-semibold">{totalScales}</div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">
              انبارهای بدون ترازو
            </div>
            <div className="text-lg font-semibold">
              {
                localWarehouses.filter(
                  (item) => (item._count?.scales ?? 0) === 0,
                ).length
              }
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در نام، موقعیت یا توضیحات انبار"
          />
        </div>

        {filteredWarehouses.map((warehouse) => (
          <div key={warehouse.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-medium flex items-center gap-2">
                  <WarehouseIcon className="size-4 text-muted-foreground" />
                  {warehouse.name}
                </div>
                {warehouse.location && (
                  <div className="text-sm text-muted-foreground">
                    {warehouse.location}
                  </div>
                )}
                {warehouse.description && (
                  <div className="text-sm text-muted-foreground">
                    {warehouse.description}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="secondary">
                    {warehouse._count?.scales ?? 0} ترازو
                  </Badge>
                  <Badge
                    variant={
                      (warehouse._count?.scales ?? 0) > 0
                        ? "default"
                        : "outline"
                    }
                  >
                    {(warehouse._count?.scales ?? 0) > 0
                      ? "آماده اتصال"
                      : "بدون ترازو"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 border-r pr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(warehouse);
                    setName(warehouse.name);
                    setLocation(warehouse.location || "");
                    setDescription(warehouse.description || "");
                    setOpen(true);
                  }}
                >
                  <Edit className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>حذف انبار</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <span className="block">
                          آیا از حذف «{warehouse.name}» مطمئن هستید؟
                        </span>
                        {((warehouse._count?.scales ?? 0) > 0 ||
                          (warehouse._count?.stockIns ?? 0) > 0) && (
                          <span className="block text-amber-600 dark:text-amber-400">
                            هشدار: این انبار {warehouse._count?.scales ?? 0}{" "}
                            ترازو و {warehouse._count?.stockIns ?? 0} ثبت ورود
                            کالا دارد.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>انصراف</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteWarehouse(warehouse)}
                      >
                        حذف
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}

        {filteredWarehouses.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            هیچ انباری با جستجوی فعلی پیدا نشد.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
