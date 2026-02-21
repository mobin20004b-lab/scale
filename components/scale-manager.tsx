"use client";

import { useEffect, useMemo, useState } from "react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Check,
  Copy,
  Edit,
  KeyRound,
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
  apiKeyLast4: string;
  warehouseId: string;
  warehouse: Warehouse;
  tare: number;
  unit: string;
  precision: number;
  locationNote: string | null;
  heartbeatIntervalSec: number;
  deviceType?: "ESP32";
  firmwareVersion?: string | null;
  lastSeenAt?: string | Date | null;
  printerType?: "TSPL" | "ESC_POS" | null;
  printerConnection?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  lastWeight: number | null;
  lastWeightAt: string | Date | null;
  archivedAt?: string | Date | null;
  isActive: boolean;
  deleteRequestedAt?: string | Date | null;
  deleteCommitAfter?: string | Date | null;
  deleteConflictAt?: string | Date | null;
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
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthInProgress, setReauthInProgress] = useState(false);
  const [reauthVerifiedAt, setReauthVerifiedAt] = useState<number | null>(null);
  const [copyConfirmScale, setCopyConfirmScale] = useState<Scale | null>(null);
  const [rotateConfirmScale, setRotateConfirmScale] = useState<Scale | null>(null);
  const [rotatedTokenData, setRotatedTokenData] = useState<{ scaleId: string; token: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [localScales, setLocalScales] = useState(scales);
  const [selectedScaleIds, setSelectedScaleIds] = useState<string[]>([]);
  const [commandTimeline, setCommandTimeline] = useState<Record<string, any[]>>({});
  const [commandBusy, setCommandBusy] = useState<Record<string, boolean>>({});
  const [configBusy, setConfigBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLocalScales(scales);
  }, [scales]);

  useEffect(() => {
    setSelectedScaleIds((previous) =>
      previous.filter((id) => localScales.some((scale) => scale.id === id))
    );
  }, [localScales]);


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

  useEffect(() => {
    if (visibleScaleIds.length === 0) return;

    Promise.all(
      visibleScaleIds.map(async (id) => {
        const response = await fetch(`/api/scales/${id}/commands?take=10`);
        if (!response.ok) return [id, []] as const;
        const payload = await response.json();
        return [id, payload.commands ?? []] as const;
      })
    )
      .then((entries) => {
        setCommandTimeline(Object.fromEntries(entries));
      })
      .catch(() => undefined);
  }, [visibleScaleIds.join(",")]);

  const enqueueCommand = async (
    scaleId: string,
    type: "PRINT_TEST" | "PRINT_LABEL" | "RESTART",
    payload: Record<string, unknown> = {}
  ) => {
    setCommandBusy((previous) => ({ ...previous, [scaleId]: true }));
    try {
      const response = await fetch(`/api/scales/${scaleId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "ارسال فرمان ناموفق بود");
      }

      const data = await response.json();
      setCommandTimeline((previous) => ({
        ...previous,
        [scaleId]: [data.command, ...(previous[scaleId] ?? [])].slice(0, 10),
      }));
      toast.success("فرمان دستگاه ثبت شد");
    } catch (error: any) {
      toast.error(error.message || "ارسال فرمان ناموفق بود");
    } finally {
      setCommandBusy((previous) => ({ ...previous, [scaleId]: false }));
    }
  };

  const saveDeviceConfig = async (scale: Scale) => {
    setConfigBusy((previous) => ({ ...previous, [scale.id]: true }));
    try {
      const response = await fetch(`/api/scales/${scale.id}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printerType: scale.printerType || "TSPL",
          config: {
            telemetryIntervalSec: scale.heartbeatIntervalSec,
            stableWeightThreshold: 0.02,
            autoPrintOnStockIn: false,
          },
        }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "ذخیره تنظیمات ناموفق بود");
      }

      toast.success("تنظیمات دستگاه ذخیره شد");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "ذخیره تنظیمات ناموفق بود");
    } finally {
      setConfigBusy((previous) => ({ ...previous, [scale.id]: false }));
    }
  };

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

  const isPendingDelete = (scale: Scale) =>
    Boolean(scale.deleteRequestedAt && scale.deleteCommitAfter);

  const deleteScale = async (scale: Scale) => {
    const response = await fetch(`/api/scales/${scale.id}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.error || "خطا در حذف ترازو");
      return;
    }

    setLocalScales((previous) =>
      previous.map((item) =>
        item.id === scale.id
          ? {
              ...item,
              deleteRequestedAt: payload.deleteRequestedAt ?? new Date().toISOString(),
              deleteCommitAfter: payload.deleteCommitAfter ?? null,
              deleteConflictAt: payload.deleteConflictAt ?? null,
            }
          : item
      )
    );

    toast.success("حذف ترازو در سرور زمان‌بندی شد.");
    router.refresh();
  };

  const recoverScaleDelete = async (scale: Scale) => {
    const response = await fetch(`/api/scales/${scale.id}/recover`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.error || "بازیابی حذف ترازو ناموفق بود");
      router.refresh();
      return;
    }

    setLocalScales((previous) =>
      previous.map((item) =>
        item.id === scale.id
          ? { ...item, deleteRequestedAt: null, deleteCommitAfter: null, deleteConflictAt: null }
          : item
      )
    );

    toast.success("حذف ترازو بازیابی شد");
    router.refresh();
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

  const ensureRecentReauth = async () => {
    if (reauthVerifiedAt && Date.now() - reauthVerifiedAt < 5 * 60 * 1000) {
      return true;
    }

    if (!reauthPassword.trim()) {
      toast.error("برای این عملیات، رمز عبور را وارد کنید");
      return false;
    }

    setReauthInProgress(true);
    try {
      const response = await fetch("/api/auth/reauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: reauthPassword }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "تأیید مجدد ناموفق بود");
      }

      setReauthVerifiedAt(Date.now());
      toast.success("تأیید مجدد انجام شد");
      return true;
    } catch (error: any) {
      toast.error(error.message || "تأیید مجدد ناموفق بود");
      return false;
    } finally {
      setReauthInProgress(false);
    }
  };

  const copyScaleToken = async (scale: Scale) => {
    const isConfirmed = window.confirm(
      `کپی توکن ترازو «${scale.name}» یک عملیات حساس است. ادامه می‌دهید؟`
    );
    if (!isConfirmed) return;

    const canProceed = await ensureRecentReauth();
    if (!canProceed) return;

    try {
      const response = await fetch(`/api/scales/${scale.id}/token/copy`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "دریافت توکن ناموفق بود");
      }

      const payload = await response.json();
      await navigator.clipboard.writeText(payload.token);
      setCopiedToken(scale.id);
      toast.success("توکن ترازو کپی شد");
      setTimeout(
        () =>
          setCopiedToken((previous) => (previous === scale.id ? null : previous)),
        1200
      );
    } catch (error: any) {
      toast.error(error.message || "کپی توکن ناموفق بود");
    }
  };

  const rotateScaleToken = async (scale: Scale) => {
    const isConfirmed = window.confirm(
      `توکن قبلی ترازو «${scale.name}» بعد از چرخش غیرقابل استفاده می‌شود. ادامه می‌دهید؟`
    );
    if (!isConfirmed) return;

    const canProceed = await ensureRecentReauth();
    if (!canProceed) return;

    try {
      const response = await fetch(`/api/scales/${scale.id}/token/rotate`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "چرخش توکن ناموفق بود");
      }

      const payload = await response.json();
      setRotatedTokenData({ scaleId: scale.id, token: payload.token });
      toast.success("توکن جدید ایجاد شد");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "چرخش توکن ناموفق بود");
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
          <DialogContent initialFocusSelector="#scale-name-input">
            <DialogHeader>
              <DialogTitle>{editing ? "ویرایش ترازو" : "افزودن ترازو"}</DialogTitle>
              <DialogDescription>تنظیمات پایه ترازو و اتصال آن به انبار را مشخص کنید.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>نام ترازو</Label>
                <Input id="scale-name-input" value={name} onChange={(e) => setName(e.target.value)} />
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
                <Button onClick={submitScale}>ذخیره</Button>
              </DialogFooter>
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
                    <div className="font-medium flex items-center gap-2">
                      {scale.name}
                      {isPendingDelete(scale) && <Badge variant="outline">در انتظار حذف</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      انبار: {scale.warehouse.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono break-all">
                      توکن: {`••••••••${scale.apiKeyLast4}`}
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
                    onClick={() => setCopyConfirmScale(scale)}
                  >
                    {copiedToken === scale.id ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRotateConfirmScale(scale)}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                        disabled={isPendingDelete(scale)}
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
                          disabled={isPendingDelete(scale)}
                        >
                          {isPendingDelete(scale) ? "حذف زمان‌بندی شده" : "حذف"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {isPendingDelete(scale) && (
                    <Button variant="secondary" size="sm" onClick={() => recoverScaleDelete(scale)}>
                      بازیابی حذف
                    </Button>
                  )}
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
              <div className="grid gap-2 md:grid-cols-2 text-xs">
                <div className="rounded-md border p-2 space-y-1">
                  <div className="font-medium">Device & Firmware</div>
                  <div>نوع دستگاه: {scale.deviceType || "ESP32"}</div>
                  <div>نسخه فریمور: {scale.firmwareVersion || "-"}</div>
                  <div>آخرین حضور: {scale.lastSeenAt ? <DateTimeText value={scale.lastSeenAt} showTimeZone /> : "-"}</div>
                  <div>پرینتر: {scale.printerType || "-"}</div>
                </div>
                <div className="rounded-md border p-2 space-y-2">
                  <div className="font-medium">Printer Control</div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="secondary" disabled={health === "OFFLINE" || commandBusy[scale.id]} onClick={() => enqueueCommand(scale.id, "PRINT_TEST")}>تست چاپ</Button>
                    <Button size="sm" variant="secondary" disabled={health === "OFFLINE" || commandBusy[scale.id]} onClick={() => enqueueCommand(scale.id, "PRINT_LABEL", { source: "latest-stock-in" })}>چاپ آخرین ورود</Button>
                    <Button size="sm" variant="secondary" disabled={health === "OFFLINE" || commandBusy[scale.id]} onClick={() => enqueueCommand(scale.id, "PRINT_LABEL", { source: "reprint-last" })}>چاپ مجدد</Button>
                    <Button size="sm" variant="outline" disabled={health === "OFFLINE" || configBusy[scale.id]} onClick={() => saveDeviceConfig(scale)}>ذخیره تنظیمات</Button>
                  </div>
                </div>
                <div className="rounded-md border p-2 space-y-1 md:col-span-2">
                  <div className="font-medium">Command Timeline</div>
                  <div className="space-y-1">
                    {(commandTimeline[scale.id] ?? []).slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-[11px]">
                        <span>{item.type}</span>
                        <Badge variant={item.status === "ACKED" ? "default" : item.status === "FAILED" ? "destructive" : "secondary"}>{item.status}</Badge>
                      </div>
                    ))}
                    {(commandTimeline[scale.id] ?? []).length === 0 && (
                      <div className="text-muted-foreground text-[11px]">فرمانی ثبت نشده است.</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground font-mono">
                Device pull: GET /api/scales/:id/device/next-command (Bearer token)
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

      <Dialog open={Boolean(copyConfirmScale)} onOpenChange={(openState) => !openState && setCopyConfirmScale(null)}>
        <DialogContent closeBehavior="destructive" initialFocusSelector="#copy-token-password">
          <DialogHeader>
            <DialogTitle>کپی توکن ترازو (حساس)</DialogTitle>
            <DialogDescription>این عملیات در Activity ثبت می‌شود. برای ادامه، رمز عبور فعلی خود را وارد کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Input id="copy-token-password" type="password" value={reauthPassword} onChange={(event) => setReauthPassword(event.target.value)} placeholder="رمز عبور" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCopyConfirmScale(null)}>انصراف</Button>
              <Button disabled={reauthInProgress || !copyConfirmScale} onClick={async () => {
                if (!copyConfirmScale) return;
                await copyScaleToken(copyConfirmScale);
                setCopyConfirmScale(null);
              }}>
                <KeyRound className="size-4 ml-2" />
                ادامه و کپی توکن
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rotateConfirmScale)} onOpenChange={(openState) => !openState && setRotateConfirmScale(null)}>
        <DialogContent closeBehavior="destructive" initialFocusSelector="#rotate-token-password">
          <DialogHeader>
            <DialogTitle>چرخش توکن ترازو</DialogTitle>
            <DialogDescription>پس از چرخش، توکن قبلی بلافاصله نامعتبر می‌شود. این عملیات در Activity ثبت می‌شود.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Input id="rotate-token-password" type="password" value={reauthPassword} onChange={(event) => setReauthPassword(event.target.value)} placeholder="رمز عبور" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRotateConfirmScale(null)}>انصراف</Button>
              <Button disabled={reauthInProgress || !rotateConfirmScale} onClick={async () => {
                if (!rotateConfirmScale) return;
                await rotateScaleToken(rotateConfirmScale);
                setRotateConfirmScale(null);
              }}>
                <RefreshCw className="size-4 ml-2" />
                چرخش توکن
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rotatedTokenData)} onOpenChange={(openState) => !openState && setRotatedTokenData(null)}>
        <DialogContent closeBehavior="destructive" initialFocusSelector="#rotated-token-close">
          <DialogHeader>
            <DialogTitle>توکن جدید (نمایش یک‌باره)</DialogTitle>
            <DialogDescription>این مقدار فقط یک‌بار نمایش داده می‌شود. آن را در جای امن نگه‌داری کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-2 font-mono text-xs break-all">
              {rotatedTokenData?.token}
            </div>
            <DialogFooter>
              <Button id="rotated-token-close" variant="outline" onClick={() => setRotatedTokenData(null)}>بستن</Button>
              <Button onClick={async () => {
                if (!rotatedTokenData) return;
                await navigator.clipboard.writeText(rotatedTokenData.token);
                toast.success("توکن جدید کپی شد");
              }}>
                <Copy className="size-4 ml-2" />
                کپی توکن جدید
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
