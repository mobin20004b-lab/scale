"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useScaleLive } from "@/hooks/use-scale-live";
import { formatDistanceToNowStrict } from "date-fns";
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
import { getScaleHealthSnapshot } from "@/lib/scale-health";
import { formatScaleWeight } from "@/lib/scale-reading";
import { Checkbox } from "@/components/ui/checkbox";
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
  tare: number;
  unit: string;
  precision: number;
  locationNote: string | null;
  heartbeatIntervalSec: number;
  lastWeight: number | null;
  lastWeightAt: string | Date | null;
  archivedAt?: string | Date | null;
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
  const [tare, setTare] = useState("0");
  const [unit, setUnit] = useState("گرم");
  const [precision, setPrecision] = useState("2");
  const [locationNote, setLocationNote] = useState("");
  const [heartbeatIntervalSec, setHeartbeatIntervalSec] = useState("1");
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [localScales, setLocalScales] = useState(scales);
  const [selectedScaleIds, setSelectedScaleIds] = useState<string[]>([]);
  const pendingDeletes = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

  useEffect(() => {
    setLocalScales(scales);
  }, [scales]);

  useEffect(() => {
    setSelectedScaleIds((previous) =>
      previous.filter((id) => localScales.some((scale) => scale.id === id))
    );
  }, [localScales]);

  useEffect(() => {
    return () => {
      Object.values(pendingDeletes.current).forEach(clearTimeout);
    };
  }, []);

  const visibleScales = useMemo(() => {
    return localScales.filter((scale) => {
      const health = getScaleHealthSnapshot(scale.lastWeightAt, {
        heartbeatIntervalSec: scale.heartbeatIntervalSec,
      }).health;
      const matchesSearch = scale.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchesWarehouse =
        warehouseFilter === "all" || scale.warehouseId === warehouseFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? scale.isActive : !scale.isActive);
      const matchesHealth = healthFilter === "all" || health === healthFilter;

      return (
        matchesSearch && matchesWarehouse && matchesStatus && matchesHealth
      );
    });
  }, [
    localScales,
    search,
    warehouseFilter,
    statusFilter,
    healthFilter,
  ]);

  const visibleScaleIds = useMemo(
    () => visibleScales.map((scale) => scale.id),
    [visibleScales]
  );

  const {
    scales: liveScales,
    isConnecting: isLoadingWeights,
    isStale: areWeightsStale,
    error: weightsError,
    refresh: refreshWeights,
  } = useScaleLive(visibleScaleIds);

  const staleWeightsError =
    areWeightsStale && !weightsError
      ? "داده‌های وزن لحظه‌ای قدیمی شده‌اند. تلاش برای بازیابی اتصال ادامه دارد."
      : null;

  const submitScale = async () => {
    try {
      const response = await fetch(
        editing ? `/api/scales/${editing.id}` : "/api/scales",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            warehouseId,
            isActive,
            tare: Number(tare),
            unit,
            precision: Number(precision),
            locationNote,
            heartbeatIntervalSec: Number(heartbeatIntervalSec),
          }),
        }
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
      setTare("0");
      setUnit("گرم");
      setPrecision("2");
      setLocationNote("");
      setHeartbeatIntervalSec("1");
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
      const payload = await response.json().catch(() => ({}));
      toast.success(payload.archived ? "ترازو آرشیو شد" : "ترازو حذف شد");
      router.refresh();
    } else {
      setLocalScales((previous) => [scale, ...previous]);
      const payload = await response.json().catch(() => ({}));
      toast.error(payload.error || "خطا در حذف ترازو");
    }
  };

  const deleteScale = (scale: Scale) => {
    setLocalScales((previous) =>
      previous.filter((item) => item.id !== scale.id)
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

  const toggleScaleSelection = (scaleId: string, checked: boolean) => {
    setSelectedScaleIds((previous) =>
      checked
        ? [...new Set([...previous, scaleId])]
        : previous.filter((id) => id !== scaleId)
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedScaleIds((previous) => [
        ...new Set([...previous, ...visibleScales.map((scale) => scale.id)]),
      ]);
      return;
    }

    setSelectedScaleIds((previous) =>
      previous.filter((id) => !visibleScales.some((scale) => scale.id === id))
    );
  };

  const applyBulkAction = async ({
    isActive,
    warehouseId,
  }: {
    isActive?: boolean;
    warehouseId?: string;
  }) => {
    if (selectedScaleIds.length === 0) {
      toast.error("ابتدا چند ترازو را انتخاب کنید");
      return;
    }

    const response = await fetch("/api/scales/bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedScaleIds, isActive, warehouseId }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      toast.error(payload.error || "اجرای عملیات گروهی ناموفق بود");
      return;
    }

    toast.success("عملیات گروهی اجرا شد");
    setSelectedScaleIds([]);
    router.refresh();
  };

  const copyScaleToken = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedToken(apiKey);
      toast.success("توکن ترازو کپی شد");
      setTimeout(
        () =>
          setCopiedToken((previous) => (previous === apiKey ? null : previous)),
        1200
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
              setTare("0");
              setUnit("گرم");
              setPrecision("2");
              setLocationNote("");
              setHeartbeatIntervalSec("1");
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>تار</Label>
                  <Input
                    value={tare}
                    onChange={(e) => setTare(e.target.value)}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>واحد</Label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>دقت نمایش</Label>
                  <Input
                    value={precision}
                    onChange={(e) => setPrecision(e.target.value)}
                    type="number"
                    min={0}
                    max={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>فاصله ضربان (ثانیه)</Label>
                  <Input
                    value={heartbeatIntervalSec}
                    onChange={(e) => setHeartbeatIntervalSec(e.target.value)}
                    type="number"
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>توضیح محل نصب</Label>
                <Input
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                />
              </div>
              <Button onClick={submitScale} className="w-full">
                ذخیره
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-4">
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
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger>
              <SelectValue placeholder="فیلتر سلامت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه سلامت‌ها</SelectItem>
              <SelectItem value="ONLINE">آنلاین</SelectItem>
              <SelectItem value="STALE">مردد</SelectItem>
              <SelectItem value="OFFLINE">آفلاین</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          نمایش {visibleScales.length} از {localScales.length} ترازو
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={
                visibleScales.length > 0 &&
                visibleScales.every((scale) =>
                  selectedScaleIds.includes(scale.id)
                )
              }
              onCheckedChange={(checked) =>
                toggleSelectAllVisible(Boolean(checked))
              }
            />
            <span className="text-sm">انتخاب همه موارد قابل مشاهده</span>
          </div>
          <Badge variant="secondary">
            {selectedScaleIds.length} انتخاب شده
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyBulkAction({ isActive: true })}
          >
            فعال‌سازی گروهی
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyBulkAction({ isActive: false })}
          >
            غیرفعال‌سازی گروهی
          </Button>
          <Select
            onValueChange={(value) => applyBulkAction({ warehouseId: value })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="انتقال گروهی به انبار" />
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

        {visibleScales.map((scale) => {
          const live = liveScales[scale.id];
          const lastWeight = live?.lastWeight ?? scale.lastWeight;
          const lastWeightAt = live?.lastWeightAt ?? scale.lastWeightAt;
          const health =
            live?.health ??
            getScaleHealthSnapshot(scale.lastWeightAt, {
              heartbeatIntervalSec: scale.heartbeatIntervalSec,
            }).health;
          const healthLabel =
            health === "ONLINE"
              ? "آنلاین"
              : health === "STALE"
                ? "مردد"
                : "آفلاین";
          const healthVariant =
            health === "ONLINE"
              ? "default"
              : health === "STALE"
                ? "secondary"
                : "destructive";
          const fallbackAgeMs = getScaleHealthSnapshot(scale.lastWeightAt, {
            heartbeatIntervalSec: scale.heartbeatIntervalSec,
          }).lastReadingAgeMs;
          const ageMs = live?.lastReadingAgeMs ?? fallbackAgeMs;
          const healthAgeLabel =
            ageMs === null
              ? "بدون داده"
              : formatDistanceToNowStrict(new Date(Date.now() - ageMs), {
                  addSuffix: true,
                });

          return (
            <div key={scale.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedScaleIds.includes(scale.id)}
                    onCheckedChange={(checked) =>
                      toggleScaleSelection(scale.id, Boolean(checked))
                    }
                    className="mt-1"
                  />
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
                    {scale.locationNote && (
                      <div className="text-xs text-muted-foreground">
                        محل: {scale.locationNote}
                      </div>
                    )}
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
                      setTare(String(scale.tare ?? 0));
                      setUnit(scale.unit || "گرم");
                      setPrecision(String(scale.precision ?? 2));
                      setLocationNote(scale.locationNote || "");
                      setHeartbeatIntervalSec(
                        String(scale.heartbeatIntervalSec ?? 1)
                      );
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
                          2
                        )
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
                              تراکنش ورود وزن‌شده دارد و به‌صورت آرشیو غیرفعال
                              می‌شود.
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
                          {(scale._count?.stockIns ?? 0) > 0 ? "آرشیو" : "حذف"}
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
                {scale.archivedAt && <Badge variant="outline">آرشیو</Badge>}
                <Badge variant={healthVariant}>{healthLabel}</Badge>
                <Badge>{formatScaleWeight(lastWeight, scale)}</Badge>
                <span className="text-muted-foreground">
                  سن آخرین قرائت: {healthAgeLabel}
                  {" · "}
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

        {(weightsError || staleWeightsError) && (
          <Empty className="border border-amber-500/40 bg-amber-500/5 p-4 md:p-5">
            <EmptyHeader className="max-w-full">
              <EmptyMedia
                variant="icon"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                <AlertCircle className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="text-base">
                دریافت وزن لحظه‌ای با خطا مواجه شد
              </EmptyTitle>
              <EmptyDescription>{weightsError || staleWeightsError}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={refreshWeights}
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
                  setHealthFilter("all");
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
