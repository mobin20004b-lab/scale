"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Check,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
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
import { DateTimeText } from "@/components/date-time-text";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface Warehouse {
  id: string;
  name: string;
}

interface Scale {
  id: string;
  name: string;
  apiKey: string;
  warehouseId: string;
  warehouse: Warehouse;
  lastWeight: number | null;
  lastWeightAt: string | Date | null;
  isActive: boolean;
  _count?: {
    stockIns: number;
  };
}

interface ScaleManagerProps {
  scales: Scale[];
  warehouses: Warehouse[];
}

export function ScaleManager({ scales, warehouses }: ScaleManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Scale | null>(null);
  const [name, setName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [liveWeights, setLiveWeights] = useState<
    Record<
      string,
      { lastWeight: number | null; lastWeightAt: string | Date | null }
    >
  >({});
  const [isLoadingWeights, setIsLoadingWeights] = useState(false);
  const [weightsError, setWeightsError] = useState<string | null>(null);
  const [weightsRefreshKey, setWeightsRefreshKey] = useState(0);
  const [localScales, setLocalScales] = useState(scales);
  const pendingDeletes = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(() => {
    setLocalScales(scales);
  }, [scales]);

  useEffect(() => {
    return () => {
      Object.values(pendingDeletes.current).forEach(clearTimeout);
    };
  }, []);

  const visibleScales = useMemo(() => {
    return localScales.filter((scale) => {
      const matchesSearch = scale.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchesWarehouse =
        warehouseFilter === "all" || scale.warehouseId === warehouseFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? scale.isActive : !scale.isActive);

      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [localScales, search, warehouseFilter, statusFilter]);

  const visibleScaleIds = useMemo(
    () => visibleScales.map((scale) => scale.id),
    [visibleScales],
  );

  useEffect(() => {
    if (visibleScaleIds.length === 0) {
      setLiveWeights({});
      setWeightsError(null);
      setIsLoadingWeights(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const getRefreshInterval = () =>
      document.visibilityState === "visible" ? 1000 : 7000;

    const fetchWeights = async ({ initialLoad = false } = {}) => {
      if (initialLoad) {
        setIsLoadingWeights(true);
      }

      let hasError = false;

      try {
        const params = new URLSearchParams({ ids: visibleScaleIds.join(",") });
        const response = await fetch(`/api/scales/live?${params.toString()}`);
        if (!response.ok) {
          hasError = true;
        } else {
          const payload = (await response.json()) as {
            scales: Array<{
              id: string;
              lastWeight: number | null;
              lastWeightAt: string | null;
            }>;
          };

          if (!cancelled) {
            const nextWeights: Record<
              string,
              { lastWeight: number | null; lastWeightAt: string | null }
            > = {};

            payload.scales.forEach((scale) => {
              nextWeights[scale.id] = {
                lastWeight: scale.lastWeight,
                lastWeightAt: scale.lastWeightAt,
              };
            });

            setLiveWeights(nextWeights);
          }
        }
      } catch {
        hasError = true;
      }

      if (!cancelled) {
        setWeightsError(
          hasError
            ? "بخشی از وزن‌های لحظه‌ای قابل دریافت نیست. اتصال شبکه یا وضعیت ترازوها را بررسی کنید."
            : null,
        );
        if (initialLoad) {
          setIsLoadingWeights(false);
        }
      }
    };

    const scheduleNext = () => {
      if (cancelled) {
        return;
      }

      timer = setTimeout(async () => {
        await fetchWeights();
        scheduleNext();
      }, getRefreshInterval());
    };

    const refreshNow = async () => {
      if (timer) {
        clearTimeout(timer);
      }
      await fetchWeights();
      scheduleNext();
    };

    void fetchWeights({ initialLoad: true }).then(() => scheduleNext());
    document.addEventListener("visibilitychange", refreshNow);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, [visibleScaleIds, weightsRefreshKey]);

  const submitScale = async () => {
    try {
      const response = await fetch(
        editing ? `/api/scales/${editing.id}` : "/api/scales",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, warehouseId, isActive }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "خطا در ذخیره ترازو");
      }

      toast.success(editing ? "ترازو ویرایش شد" : "ترازو ایجاد شد");
      setOpen(false);
      setEditing(null);
      setName("");
      setWarehouseId("");
      setIsActive(true);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "خطا در ذخیره ترازو");
    }
  };

  const executeDeleteScale = async (scale: Scale) => {
    const response = await fetch(`/api/scales/${scale.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      toast.success("ترازو حذف شد");
      router.refresh();
    } else {
      setLocalScales((previous) => [scale, ...previous]);
      toast.error("خطا در حذف ترازو");
    }
  };

  const deleteScale = (scale: Scale) => {
    setLocalScales((previous) =>
      previous.filter((item) => item.id !== scale.id),
    );

    pendingDeletes.current[scale.id] = setTimeout(() => {
      delete pendingDeletes.current[scale.id];
      executeDeleteScale(scale);
    }, 5000);

    toast("ترازو برای حذف علامت‌گذاری شد", {
      description: "برای لغو حذف، تا ۵ ثانیه آینده بازگردانی را بزنید.",
      action: {
        label: "بازگردانی",
        onClick: () => {
          const timer = pendingDeletes.current[scale.id];
          if (timer) {
            clearTimeout(timer);
            delete pendingDeletes.current[scale.id];
            setLocalScales((previous) => [scale, ...previous]);
            toast.success("حذف ترازو لغو شد");
          }
        },
      },
    });
  };

  const copyScaleToken = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedToken(apiKey);
      toast.success("توکن ترازو کپی شد");
      setTimeout(
        () =>
          setCopiedToken((previous) => (previous === apiKey ? null : previous)),
        1200,
      );
    } catch {
      toast.error("کپی توکن ناموفق بود");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>مدیریت ترازوها</CardTitle>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setEditing(null);
              setName("");
              setWarehouseId("");
              setIsActive(true);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 ml-2" />
              افزودن ترازو
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "ویرایش ترازو" : "افزودن ترازو"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>نام ترازو</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>انبار</Label>
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
              </div>
              <div className="space-y-2">
                <Label>وضعیت ترازو</Label>
                <Select
                  value={isActive ? "active" : "inactive"}
                  onValueChange={(value) => setIsActive(value === "active")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">فعال</SelectItem>
                    <SelectItem value="inactive">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={submitScale} className="w-full">
                ذخیره
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام ترازو"
          />
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger>
              <SelectValue placeholder="فیلتر انبار" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انبارها</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="فیلتر وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="active">فقط فعال</SelectItem>
              <SelectItem value="inactive">فقط غیرفعال</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          نمایش {visibleScales.length} از {localScales.length} ترازو
        </div>

        {visibleScales.map((scale) => {
          const live = liveWeights[scale.id];
          const lastWeight = live?.lastWeight ?? scale.lastWeight;
          const lastWeightAt = live?.lastWeightAt ?? scale.lastWeightAt;

          return (
            <div key={scale.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{scale.name}</div>
                  <div className="text-sm text-muted-foreground">
                    انبار: {scale.warehouse.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono break-all">
                    توکن:{" "}
                    {showTokens[scale.id]
                      ? scale.apiKey
                      : `••••••••${scale.apiKey.slice(-6)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    شناسه ترازو: {scale.id}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(scale);
                      setName(scale.name);
                      setWarehouseId(scale.warehouseId);
                      setIsActive(scale.isActive);
                      setOpen(true);
                    }}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setShowTokens((previous) => ({
                        ...previous,
                        [scale.id]: !previous[scale.id],
                      }))
                    }
                  >
                    {showTokens[scale.id] ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyScaleToken(scale.apiKey)}
                  >
                    {copiedToken === scale.apiKey ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        JSON.stringify(
                          { scaleId: scale.id, token: scale.apiKey },
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    <RefreshCw className="size-4" />
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
                        <AlertDialogTitle>حذف ترازو</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <span className="block">
                            آیا از حذف «{scale.name}» مطمئن هستید؟
                          </span>
                          <span className="block">
                            انبار: <strong>{scale.warehouse.name}</strong>
                          </span>
                          {(scale._count?.stockIns ?? 0) > 0 && (
                            <span className="block text-amber-600 dark:text-amber-400">
                              هشدار: این ترازو {scale._count?.stockIns ?? 0}{" "}
                              تراکنش ورود وزن‌شده دارد.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteScale(scale)}
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={scale.isActive ? "default" : "secondary"}>
                  {scale.isActive ? "فعال" : "غیرفعال"}
                </Badge>
                <Badge>
                  {lastWeight !== null
                    ? `${Number(lastWeight).toFixed(2)} گرم`
                    : "بدون وزن"}
                </Badge>
                <span className="text-muted-foreground">
                  {lastWeightAt ? (
                    <>
                      آخرین دریافت:{" "}
                      <DateTimeText value={lastWeightAt} showTimeZone />
                    </>
                  ) : (
                    "داده‌ای دریافت نشده"
                  )}
                </span>
              </div>
              <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground font-mono">
                POST /api/external/stock-in + header: x-scale-token
              </div>
            </div>
          );
        })}

        {isLoadingWeights && visibleScaleIds.length > 0 && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {weightsError && (
          <Empty className="border border-amber-500/40 bg-amber-500/5 p-4 md:p-5">
            <EmptyHeader className="max-w-full">
              <EmptyMedia variant="icon" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertCircle className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="text-base">دریافت وزن لحظه‌ای با خطا مواجه شد</EmptyTitle>
              <EmptyDescription>{weightsError}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWeightsRefreshKey((prev) => prev + 1)}
              >
                <RefreshCw className="size-4 ml-2" />
                تلاش مجدد دریافت وزن
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {visibleScales.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>هیچ ترازویی پیدا نشد</EmptyTitle>
              <EmptyDescription>
                فیلترها را تغییر دهید یا یک ترازو جدید اضافه کنید.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setWarehouseFilter("all");
                  setStatusFilter("all");
                }}
              >
                پاک کردن فیلترها
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
