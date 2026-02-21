"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  deleteRequestedAt?: string | Date | null;
  deleteCommitAfter?: string | Date | null;
  deleteConflictAt?: string | Date | null;
  _count?: { scales: number; stockIns: number; stockOuts?: number };
}

interface WarehouseManagerProps {
  warehouses: Warehouse[];
}

const DESCRIPTION_MAX = 300;
const LOCATION_MAX = 120;

type FormErrors = {
  name?: string;
  location?: string;
  description?: string;
};

export function WarehouseManager({ warehouses }: WarehouseManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [localWarehouses, setLocalWarehouses] = useState(warehouses);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalWarehouses(warehouses);
  }, [warehouses]);

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
    0
  );

  const resetForm = () => {
    setName("");
    setLocation("");
    setDescription("");
    setErrors({});
    setEditing(null);
  };

  const validateForm = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!name.trim()) {
      nextErrors.name = "نام انبار الزامی است.";
    }

    if (location.length > LOCATION_MAX) {
      nextErrors.location = `موقعیت نمی‌تواند بیشتر از ${LOCATION_MAX} کاراکتر باشد.`;
    }

    if (description.length > DESCRIPTION_MAX) {
      nextErrors.description = `توضیحات نمی‌تواند بیشتر از ${DESCRIPTION_MAX} کاراکتر باشد.`;
    }

    return nextErrors;
  };

  const focusFirstInvalidField = (nextErrors: FormErrors) => {
    if (nextErrors.name) {
      nameInputRef.current?.focus();
      return;
    }

    if (nextErrors.location) {
      locationInputRef.current?.focus();
      return;
    }

    if (nextErrors.description) {
      descriptionInputRef.current?.focus();
    }
  };

  const submitWarehouse = async () => {
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    try {
      const response = await fetch(
        editing ? `/api/warehouses/${editing.id}` : "/api/warehouses",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            location: location.trim(),
            description: description.trim(),
          }),
        }
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

  const isPendingDelete = (warehouse: Warehouse) =>
    Boolean(warehouse.deleteRequestedAt && warehouse.deleteCommitAfter);

  const getDependencies = (warehouse: Warehouse) => {
    const scales = warehouse._count?.scales ?? 0;
    const transactions =
      (warehouse._count?.stockIns ?? 0) + (warehouse._count?.stockOuts ?? 0);
    return {
      scales,
      transactions,
      hasDependencies: scales > 0 || transactions > 0,
    };
  };

  const deleteWarehouse = async (
    warehouse: Warehouse,
    mode: "archive" | "delete"
  ) => {
    const response = await fetch(`/api/warehouses/${warehouse.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.error || "خطا در حذف/آرشیو انبار");
      return;
    }

    toast.success(
      mode === "archive" ? "انبار آرشیو شد." : "حذف انبار در سرور زمان‌بندی شد."
    );
    router.refresh();
  };

  const recoverWarehouseDelete = async (warehouse: Warehouse) => {
    const response = await fetch(`/api/warehouses/${warehouse.id}/recover`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.error || "بازیابی حذف انبار ناموفق بود");
      return;
    }

    toast.success("حذف انبار بازیابی شد");
    router.refresh();
  };

  const locationCounterTone = useMemo(
    () =>
      location.length > LOCATION_MAX
        ? "text-destructive"
        : "text-muted-foreground",
    [location.length]
  );
  const descriptionCounterTone = useMemo(
    () =>
      description.length > DESCRIPTION_MAX
        ? "text-destructive"
        : "text-muted-foreground",
    [description.length]
  );

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
          <DialogContent initialFocusSelector="#warehouse-name-input">
            <DialogHeader>
              <DialogTitle>
                {editing ? "ویرایش انبار" : "افزودن انبار"}
              </DialogTitle>
              <DialogDescription>
                اطلاعات پایه انبار را تکمیل کنید و سپس ذخیره را بزنید.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="warehouse-name-input">
                  نام انبار <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="warehouse-name-input"
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name)
                      setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse-location-input">موقعیت</Label>
                <Input
                  id="warehouse-location-input"
                  ref={locationInputRef}
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (errors.location)
                      setErrors((prev) => ({ ...prev, location: undefined }));
                  }}
                  aria-invalid={Boolean(errors.location)}
                />
                <div className="flex items-center justify-between">
                  {errors.location ? (
                    <p className="text-xs text-destructive">
                      {errors.location}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      حداکثر {LOCATION_MAX} کاراکتر
                    </span>
                  )}
                  <span className={`text-xs ${locationCounterTone}`}>
                    {location.length}/{LOCATION_MAX}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse-description-input">توضیحات</Label>
                <textarea
                  id="warehouse-description-input"
                  ref={descriptionInputRef}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description)
                      setErrors((prev) => ({
                        ...prev,
                        description: undefined,
                      }));
                  }}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  aria-invalid={Boolean(errors.description)}
                />
                <div className="flex items-center justify-between">
                  {errors.description ? (
                    <p className="text-xs text-destructive">
                      {errors.description}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      حداکثر {DESCRIPTION_MAX} کاراکتر
                    </span>
                  )}
                  <span className={`text-xs ${descriptionCounterTone}`}>
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  انصراف
                </Button>
                <Button onClick={submitWarehouse}>ذخیره</Button>
              </DialogFooter>
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
                  (item) => (item._count?.scales ?? 0) === 0
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

        {filteredWarehouses.map((warehouse) => {
          const dependencies = getDependencies(warehouse);

          return (
            <div key={warehouse.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    <WarehouseIcon className="size-4 text-muted-foreground" />
                    {warehouse.name}
                    {isPendingDelete(warehouse) && (
                      <Badge variant="outline">در انتظار حذف</Badge>
                    )}
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
                      setErrors({});
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
                        disabled={isPendingDelete(warehouse)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent closeBehavior="destructive">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {dependencies.hasDependencies
                            ? "آرشیو/حذف انبار"
                            : "حذف انبار"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <span className="block">
                            آیا از{" "}
                            {dependencies.hasDependencies
                              ? "آرشیو یا حذف"
                              : "حذف"}{" "}
                            «{warehouse.name}» مطمئن هستید؟
                          </span>
                          <div className="rounded-md border bg-muted/30 p-3 text-sm">
                            <p className="mb-2 font-medium">چک‌لیست اثرات:</p>
                            <ul className="list-disc space-y-1 pr-5">
                              <li>
                                تعداد ترازوهای وابسته:{" "}
                                <strong>{dependencies.scales}</strong>
                              </li>
                              <li>
                                تعداد تراکنش‌های انبار (ورود/خروج):{" "}
                                <strong>{dependencies.transactions}</strong>
                              </li>
                              <li>
                                اقدام پیشنهادی:{" "}
                                <strong>
                                  {dependencies.hasDependencies
                                    ? "آرشیو"
                                    : "حذف"}
                                </strong>
                              </li>
                            </ul>
                          </div>
                          {dependencies.hasDependencies && (
                            <p className="text-amber-600 dark:text-amber-400">
                              به‌دلیل وابستگی فعال، حذف مستقیم توصیه نمی‌شود.
                              ابتدا با آرشیو از حذف ناخواسته گره‌های عملیاتی
                              جلوگیری کنید.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href="/dashboard/scales">
                                مشاهده ترازوهای مرتبط
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link href="/dashboard/movements">
                                مشاهده تراکنش‌های مرتبط
                              </Link>
                            </Button>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        {dependencies.hasDependencies && (
                          <AlertDialogAction
                            className="bg-amber-600 text-white hover:bg-amber-700"
                            onClick={() =>
                              deleteWarehouse(warehouse, "archive")
                            }
                            disabled={isPendingDelete(warehouse)}
                          >
                            آرشیو (پیشنهادی)
                          </AlertDialogAction>
                        )}
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() =>
                            deleteWarehouse(
                              warehouse,
                              dependencies.hasDependencies
                                ? "archive"
                                : "delete"
                            )
                          }
                          disabled={isPendingDelete(warehouse)}
                        >
                          {isPendingDelete(warehouse)
                            ? "حذف زمان‌بندی شده"
                            : dependencies.hasDependencies
                              ? "ادامه با آرشیو"
                              : "حذف"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {isPendingDelete(warehouse) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => recoverWarehouseDelete(warehouse)}
                    >
                      بازیابی حذف
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredWarehouses.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            هیچ انباری با جستجوی فعلی پیدا نشد.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
