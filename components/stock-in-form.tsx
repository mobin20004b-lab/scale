"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCcw, Scan, Plus, TriangleAlert, Info, Lock, CheckCircle2, Volume2, ExternalLink, Clock3 } from "lucide-react";
import { useScaleLive } from "@/hooks/use-scale-live";
import { BarcodeScanner } from "./barcode-scanner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { stockInFormSchema } from "@/lib/schemas/inventory";
import { findProductByScannedBarcode } from "@/lib/product-barcode";
import { formatScaleWeight } from "@/lib/scale-reading";
import { EmptyStatePanel } from "@/components/ui/async-state";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  focusFirstInvalidField,
  FormErrorSummary,
  handleFormKeyboardNavigation,
  SaveState,
  SaveStatusInline,
  useUnsavedChangesGuard,
} from "@/components/forms/form-utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type StockInFormData = import("zod").infer<typeof stockInFormSchema>;

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  unit: string;
  currentStock: number;
  weightPerUnit: number;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Scale {
  id: string;
  name: string;
  warehouseId: string;
  tare: number;
  unit: string;
  precision: number;
}

interface StockInFormProps {
  products: Product[];
  warehouses: Warehouse[];
  scales: Scale[];
}

const SPARKLINE_WINDOW_MS = 10000;
const STABLE_AVERAGE_WINDOW_MS = 2000;
const DEFAULT_AUTO_CAPTURE_READINGS = 4;
const DEFAULT_MANUAL_REASON = "Scale unavailable";
const CAPTURE_FRESHNESS_MS = 15000;
const UNKNOWN_BARCODE_DEBOUNCE_MS = 5000;

type WeightTrendPoint = { value: number; timestamp: number };

function getStatusLabel(status: "stable" | "fluctuating" | "stale") {
  if (status === "stable") return "Stable";
  if (status === "fluctuating") return "Fluctuating";
  return "Stale";
}

export function StockInForm({
  products,
  warehouses,
  scales,
}: StockInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedScaleId, setSelectedScaleId] = useState<string>("");
  const [liveWeight, setLiveWeight] = useState<number | null>(null);
  const [weightTrend, setWeightTrend] = useState<WeightTrendPoint[]>([]);
  const [isWeightLocked, setIsWeightLocked] = useState(false);
  const [lockedWeight, setLockedWeight] = useState<number | null>(null);
  const [useAutoCapture, setUseAutoCapture] = useState(false);
  const [autoCaptureReadings, setAutoCaptureReadings] = useState(DEFAULT_AUTO_CAPTURE_READINGS);
  const [scannerStatus, setScannerStatus] = useState<
    "idle" | "scanning" | "success" | "unknown" | "duplicate" | "error"
  >("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [manualMode, setManualMode] = useState(false);
  const [manualReason, setManualReason] = useState("");
  const [playAudioFeedback, setPlayAudioFeedback] = useState(false);
  const [autoPrintLabel, setAutoPrintLabel] = useState(false);
  const [labelSize, setLabelSize] = useState<"50x30" | "60x40">("50x30");
  const [lastStockInId, setLastStockInId] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [capturedScaleWeight, setCapturedScaleWeight] = useState<number | null>(null);
  const [lastStableAt, setLastStableAt] = useState<string | null>(null);
  const [captureSource, setCaptureSource] = useState<"current" | "stable-average" | "auto" | "locked" | "manual" | null>(null);
  const [pendingPrintHtml, setPendingPrintHtml] = useState<string | null>(null);
  const [pendingPrintIds, setPendingPrintIds] = useState<string[]>([]);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const lastUnknownScanRef = useRef<{ code: string; timestamp: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
    reset,
    watch,
    setFocus,
  } = useForm<StockInFormData>({
    resolver: zodResolver(stockInFormSchema),
    mode: "onChange",
    defaultValues: {
      productId: "",
      quantity: "",
      supplier: "",
      invoiceNumber: "",
      sourceDocumentType: "",
      sourceDocumentNumber: "",
      lotBatch: "",
      expiryDate: "",
      supplierLot: "",
      qualityResult: "",
      notes: "",
    },
  });

  const productId = watch("productId");
  const quantity = watch("quantity");
  const sourceDocumentType = watch("sourceDocumentType");
  const guard = useUnsavedChangesGuard(isDirty && !isLoading);
  const errorList = useMemo(
    () =>
      Object.values(errors).flatMap((error) =>
        error?.message ? [error.message] : []
      ),
    [errors]
  );

  const filteredScales = useMemo(
    () => scales.filter((scale) => scale.warehouseId === selectedWarehouseId),
    [scales, selectedWarehouseId]
  );

  const selectedScale = useMemo(
    () => scales.find((scale) => scale.id === selectedScaleId) ?? null,
    [scales, selectedScaleId]
  );

  const stockPreview = useMemo(() => {
    if (!selectedProduct) return null;

    const parsedQuantity = Number(quantity);
    const current = Number(selectedProduct.currentStock);

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return { current, after: current };
    }

    return { current, after: current + parsedQuantity };
  }, [quantity, selectedProduct]);

  const expectedPackWeight = useMemo(() => {
    if (!selectedProduct) return null;
    return Number(selectedProduct.weightPerUnit || 0);
  }, [selectedProduct]);

  const capturedQuantityNumber = Number(quantity);
  const packWeightDeviation =
    expectedPackWeight && Number.isFinite(capturedQuantityNumber)
      ? Math.abs(capturedQuantityNumber - expectedPackWeight)
      : null;

  const isSubmitDisabled =
    isLoading ||
    !isValid ||
    !productId ||
    !selectedWarehouseId ||
    (!manualMode && !selectedScaleId) ||
    (manualMode && manualReason.trim().length === 0);

  useEffect(() => {
    const presetProductId = searchParams.get("productId");

    if (!presetProductId) return;

    const product = products.find((p) => p.id === presetProductId);
    if (!product) return;

    setValue("productId", product.id, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setSelectedProduct(product);
  }, [products, searchParams, setValue]);

  const {
    scales: liveScales,
    isConnecting: isFetchingWeight,
    isStale: isWeightStale,
    connectionState,
    nextReconnectInMs,
    error: weightError,
    refresh: refreshWeight,
  } = useScaleLive(selectedScaleId ? [selectedScaleId] : []);

  useEffect(() => {
    if (!selectedScaleId) {
      setLiveWeight(null);
      return;
    }

    setLiveWeight(liveScales[selectedScaleId]?.lastWeight ?? null);
  }, [liveScales, selectedScaleId]);

  const selectedScaleLive = selectedScaleId ? liveScales[selectedScaleId] : null;
  const precision = selectedScale?.precision ?? 2;
  const unit = selectedScale?.unit ?? "";
  const tolerance = useMemo(() => Math.max(10 ** -precision, 0.001), [precision]);

  useEffect(() => {
    if (liveWeight === null || isWeightLocked) {
      return;
    }

    setWeightTrend((previous) => {
      const now = Date.now();
      const next = [...previous, { value: liveWeight, timestamp: now }].filter(
        (point) => now - point.timestamp <= SPARKLINE_WINDOW_MS
      );
      return next.slice(-80);
    });
  }, [isWeightLocked, liveWeight]);

  const stableWindowPoints = useMemo(() => {
    const now = Date.now();
    return weightTrend.filter((point) => now - point.timestamp <= STABLE_AVERAGE_WINDOW_MS);
  }, [weightTrend, liveWeight]);

  const stableAverage = useMemo(() => {
    if (stableWindowPoints.length === 0) {
      return null;
    }

    const total = stableWindowPoints.reduce((sum, point) => sum + point.value, 0);
    return total / stableWindowPoints.length;
  }, [stableWindowPoints]);

  const stableSpread = useMemo(() => {
    if (stableWindowPoints.length === 0) {
      return null;
    }

    const values = stableWindowPoints.map((point) => point.value);
    return Math.max(...values) - Math.min(...values);
  }, [stableWindowPoints]);

  const isStable = Boolean(
    stableAverage !== null &&
      stableSpread !== null &&
      stableSpread <= tolerance &&
      stableWindowPoints.length >= autoCaptureReadings
  );

  const scaleStatus: "stable" | "fluctuating" | "stale" = isWeightStale
    ? "stale"
    : isStable
      ? "stable"
      : "fluctuating";

  const lastReadingAgeMs = selectedScaleLive?.lastReadingAgeMs ?? null;
  const captureAgeMs = capturedAt ? Date.now() - new Date(capturedAt).getTime() : null;
  const isCapturedMeasurementStale =
    !manualMode && (captureAgeMs === null || captureAgeMs > CAPTURE_FRESHNESS_MS || isWeightStale);

  const grossWeight = liveWeight;
  const tareWeight = selectedScale?.tare ?? 0;
  const netWeight =
    grossWeight === null ? null : Math.max(0, Number((grossWeight - tareWeight).toFixed(precision)));

  const setCapturedQuantity = (value: number, source: "current" | "stable-average" | "auto" | "locked" | "manual") => {
    setValue("quantity", String(Number(value.toFixed(precision))), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setCapturedAt(new Date().toISOString());
    setCapturedScaleWeight(value);
    setCaptureSource(source);

    if (playAudioFeedback && typeof window !== "undefined") {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = source === "auto" ? 1120 : 940;
      gain.gain.value = 0.05;
      oscillator.start();
      oscillator.stop(context.currentTime + 0.09);
    }
  };

  useEffect(() => {
    if (!useAutoCapture || !isStable || stableAverage === null || isWeightLocked || manualMode) {
      return;
    }

    setCapturedQuantity(stableAverage, "auto");
  }, [useAutoCapture, isStable, stableAverage, isWeightLocked, manualMode]);

  useEffect(() => {
    if (isStable) {
      setLastStableAt(new Date().toISOString());
    }
  }, [isStable, stableAverage]);

  useEffect(() => {
    if (manualMode) {
      return;
    }

    if (!capturedAt) {
      return;
    }

    if (captureAgeMs !== null && captureAgeMs > CAPTURE_FRESHNESS_MS) {
      toast.warning("آخرین وزن کپچر شده قدیمی است؛ لطفاً دوباره وزن‌گیری کنید.");
    }
  }, [captureAgeMs, capturedAt, manualMode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "F9") {
        return;
      }

      event.preventDefault();
      if (!isSubmitDisabled) {
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSubmitDisabled]);

  const handleBarcodeScanned = async (barcode: string) => {
    const normalizedBarcode = barcode.trim();
    const now = Date.now();
    if (
      lastUnknownScanRef.current &&
      lastUnknownScanRef.current.code === normalizedBarcode &&
      now - lastUnknownScanRef.current.timestamp < UNKNOWN_BARCODE_DEBOUNCE_MS
    ) {
      setScannerStatus("duplicate");
      toast.message("این بارکد ناشناس اخیراً ثبت شده است.");
      return;
    }

    const product = findProductByScannedBarcode(products, barcode);
    if (product) {
      setValue("productId", product.id.toString(), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setSelectedProduct(product);
      setShowScanner(false);
      setScannerStatus("success");
      toast.success(`محصول پیدا شد: ${product.name}`);
      setFocus("quantity");
    } else {
      lastUnknownScanRef.current = { code: normalizedBarcode, timestamp: now };
      await fetch("/api/barcodes/unknown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, source: "stock-in" }),
      }).catch(() => null);
      setScannerStatus("unknown");
      toast.error("محصولی با این بارکد یافت نشد؛ مورد در لیست بارکدهای ناشناخته ثبت شد.", {
        action: {
          label: "open unknown barcode queue",
          onClick: () => router.push("/dashboard/stock-in"),
        },
      });
    }
  };

  const onSubmit = async (data: StockInFormData) => {
    if (manualMode && manualReason.trim().length === 0) {
      toast.error("در حالت دستی، ثبت دلیل الزامی است.");
      return;
    }

    if (!manualMode && isCapturedMeasurementStale) {
      toast.error("آخرین وزن معتبر نیست. پیش از ثبت، دوباره وزن را کپچر کنید.");
      return;
    }

    setIsLoading(true);
    setSaveState("saving");
    const toastId = toast.loading("Saving...", { duration: Infinity });

    try {
      const response = await fetch("/api/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          productId: data.productId,
          quantity: parseFloat(data.quantity),
          warehouseId: selectedWarehouseId || null,
          scaleId: manualMode ? null : selectedScaleId || null,
          scaleWeight: manualMode ? null : capturedScaleWeight,
          capturedAt,
          stableWindowMs: STABLE_AVERAGE_WINDOW_MS,
          sourceScaleId: manualMode ? null : selectedScaleId || null,
          confidence: isStable ? 0.95 : 0.65,
          captureSource: captureSource ?? (manualMode ? "manual" : "current"),
          manualEntryReason: manualMode ? manualReason || DEFAULT_MANUAL_REASON : null,
        }),
      });

      if (response.ok) {
        const created = (await response.json()) as { id: string };
        setSaveState("saved");
        toast.success("Saved", { id: toastId, duration: 5000 });
        setLastStockInId(created.id);

        if (autoPrintLabel && created.id) {
          await handlePrintLabels([created.id]);
        }

        reset();
        setSelectedProduct(null);
        setSelectedWarehouseId("");
        setSelectedScaleId("");
        setLiveWeight(null);
        setWeightTrend([]);
        setIsWeightLocked(false);
        setLockedWeight(null);
        setCapturedAt(null);
        setCapturedScaleWeight(null);
        setCaptureSource(null);
        setManualReason("");
        router.refresh();
      } else {
        const error = await response.json();
        setSaveState("failed");
        toast.error(error.error || "Failed", { id: toastId, duration: 7000 });
      }
    } catch {
      setSaveState("failed");
      toast.error("Failed", { id: toastId, duration: 7000 });
    } finally {
      setIsLoading(false);
    }
  };

  const recordPrintAttempt = async (stockInIds: string[], outcome: "attempted" | "blocked" | "printed", details?: string) => {
    await fetch("/api/labels/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockInIds, labelSize, outcome, details }),
    }).catch(() => null);
  };

  const executePrint = async () => {
    if (!pendingPrintHtml || pendingPrintIds.length === 0) {
      return;
    }

    await recordPrintAttempt(pendingPrintIds, "attempted");
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=700");
    if (!printWindow) {
      setIsPopupBlocked(true);
      await recordPrintAttempt(pendingPrintIds, "blocked", "popup blocked");
      toast.error("پنجره چاپ توسط مرورگر مسدود شد. پس از اجازه popup دوباره تلاش کنید.");
      return;
    }

    printWindow.document.write(pendingPrintHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setIsPrintPreviewOpen(false);
    setPendingPrintHtml(null);
    setPendingPrintIds([]);
    setIsPopupBlocked(false);
    await recordPrintAttempt(pendingPrintIds, "printed");
  };

  const handlePrintLabels = async (stockInIds: string[]) => {
    setIsPreparingPrint(true);
    const response = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "stock-in", stockInIds, size: labelSize }),
    });

    if (!response.ok) {
      setIsPreparingPrint(false);
      throw new Error("print failed");
    }

    const data = (await response.json()) as { html: string };
    setPendingPrintHtml(data.html);
    setPendingPrintIds(stockInIds);
    setIsPopupBlocked(false);
    setIsPrintPreviewOpen(true);
    setIsPreparingPrint(false);
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            ثبت ورود کالا
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyStatePanel
            title="محصولی برای ثبت ورود وجود ندارد"
            description="ابتدا محصول جدید ثبت کنید تا فرم ورود فعال شود."
            className="p-6"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5" />
          ثبت ورود کالا
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          onSubmit={handleSubmit(onSubmit, () =>
            focusFirstInvalidField(formRef.current)
          )}
          onKeyDown={(event) =>
            handleFormKeyboardNavigation(
              event,
              'button[aria-label="باز کردن اسکنر بارکد"]'
            )
          }
          className="space-y-4 pb-28 md:pb-0"
        >
          <FormErrorSummary errors={errorList} />
          <SaveStatusInline state={saveState} />
          <div className="space-y-2">
            <Label>انبار</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={(value) => {
                setSelectedWarehouseId(value);
                setSelectedScaleId("");
              }}
            >
              <SelectTrigger aria-label="انتخاب انبار">
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
            {!selectedWarehouseId && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                برای جلوگیری از ثبت اشتباه، ابتدا انبار را انتخاب کنید.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>ترازو</Label>
            <Select
              value={selectedScaleId}
              onValueChange={setSelectedScaleId}
              disabled={!selectedWarehouseId}
            >
              <SelectTrigger aria-label="انتخاب ترازو">
                <SelectValue placeholder="انتخاب ترازو" />
              </SelectTrigger>
              <SelectContent>
                {filteredScales.map((scale) => (
                  <SelectItem key={scale.id} value={scale.id}>
                    {scale.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedScaleId && selectedWarehouseId && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                انتخاب ترازو برای ثبت ورود الزامی است.
              </p>
            )}
          </div>

          {selectedWarehouseId && filteredScales.length === 0 && (
            <Empty className="p-4">
              <EmptyHeader>
                <EmptyTitle className="text-base">
                  ترازوی فعالی برای این انبار ثبت نشده است
                </EmptyTitle>
                <EmptyDescription>
                  برای ثبت وزن، ابتدا از بخش مدیریت ترازو یک ترازو اضافه یا فعال
                  کنید.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Scale Status Widget</p>
                <p className="text-xs text-muted-foreground">scan → weigh → confirm</p>
              </div>
              <div className="flex items-center gap-2 rounded-md border p-1">
                <Button type="button" variant={!manualMode ? "default" : "ghost"} size="sm" onClick={() => setManualMode(false)}>
                  Scale-assisted
                </Button>
                <Button type="button" variant={manualMode ? "default" : "ghost"} size="sm" onClick={() => setManualMode(true)}>
                  Manual
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2">
              {!manualMode
                ? "در حالت scale-assisted فقط وزن کپچر شده‌ی تازه ثبت می‌شود و وزن‌های قدیمی قابل ارسال نیستند."
                : "در حالت manual مسئولیت ورود مقدار با اپراتور است و ثبت دلیل الزامی است."}
            </p>

            {manualMode && (
              <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-xs">Scale unavailable: manual entry enabled.</p>
                <Input
                  value={manualReason}
                  onChange={(event) => setManualReason(event.target.value)}
                  placeholder="دلیل ورود دستی (اجباری)"
                />
              </div>
            )}

            {selectedScaleId && !manualMode && (
              <>
                {isFetchingWeight && <Skeleton className="h-16 w-full" />}

                {(weightError || isWeightStale) && (
                  <Empty className="gap-3 border border-destructive/40 bg-destructive/5 p-4">
                    <EmptyHeader className="max-w-full">
                      <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                        <TriangleAlert className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle className="text-base">خطا در دریافت وزن ترازو</EmptyTitle>
                      <EmptyDescription>
                        {weightError || "داده وزن به‌روز نیست. اتصال لحظه‌ای ممکن است ناپایدار باشد."}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button type="button" variant="outline" onClick={refreshWeight}>
                        <RefreshCcw className="size-4 ml-2" />
                        تلاش مجدد
                      </Button>
                    </EmptyContent>
                  </Empty>
                )}

                <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Live Weight</p>
                      <p className="text-4xl font-bold leading-none" dir="ltr">
                        {liveWeight !== null ? liveWeight.toFixed(precision) : "--"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{unit} · ±{tolerance.toFixed(precision)}</p>
                    </div>
                    <Badge variant={scaleStatus === "stable" ? "default" : scaleStatus === "fluctuating" ? "secondary" : "destructive"}>
                      {getStatusLabel(scaleStatus)}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    last update {lastReadingAgeMs ?? "--"} ms ago · connection: {connectionState}
                    {connectionState === "reconnecting" && nextReconnectInMs !== null && ` (retry in ${nextReconnectInMs} ms)`}
                  </div>

                  <div className="h-12 w-full rounded-md border bg-background/70 p-2 flex items-end gap-1">
                    {(weightTrend.length > 1 ? weightTrend : [{ value: 0, timestamp: 0 }]).map((point, index, all) => {
                      const values = all.map((item) => item.value);
                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      const range = Math.max(0.0001, max - min);
                      const height = 20 + ((point.value - min) / range) * 80;
                      return <div key={`${point.timestamp}-${index}`} className="w-1 rounded-sm bg-primary/70" style={{ height: `${height}%` }} />;
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border p-2">Tare: {tareWeight.toFixed(precision)} {unit}</div>
                    <div className="rounded border p-2">Gross: {grossWeight !== null ? grossWeight.toFixed(precision) : "--"} {unit}</div>
                    <div className="rounded border p-2 col-span-2">Net: {netWeight !== null ? netWeight.toFixed(precision) : "--"} {unit}</div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <Button type="button" size="sm" variant="secondary" onClick={() => liveWeight !== null && setCapturedQuantity(liveWeight, "current")}>
                      Use current
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => stableAverage !== null && setCapturedQuantity(stableAverage, "stable-average")}>
                      Use stable average (2s)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isWeightLocked ? "default" : "outline"}
                      onClick={() => {
                        if (!isWeightLocked && liveWeight !== null) {
                          setLockedWeight(liveWeight);
                          setCapturedQuantity(liveWeight, "locked");
                        }
                        setIsWeightLocked((previous) => !previous);
                      }}
                    >
                      <Lock className="size-4 ml-1" />
                      Lock weight
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="text-xs font-medium">Auto-capture when stable</p>
                      <p className="text-xs text-muted-foreground">N readings within ± tolerance</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={useAutoCapture} onCheckedChange={setUseAutoCapture} />
                      <Input
                        type="number"
                        className="w-20 h-8"
                        value={autoCaptureReadings}
                        min={2}
                        onChange={(event) => setAutoCaptureReadings(Math.max(2, Number(event.target.value) || 2))}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {captureSource && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="size-3" /> captured via {captureSource}
                {capturedAt ? ` at ${new Date(capturedAt).toLocaleTimeString()}` : ""}
                {lockedWeight !== null && isWeightLocked ? ` · locked ${lockedWeight.toFixed(precision)}` : ""}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="audio-feedback"
                checked={playAudioFeedback}
                onCheckedChange={(checked) => setPlayAudioFeedback(Boolean(checked))}
              />
              <Label htmlFor="audio-feedback" className="text-xs flex items-center gap-1"><Volume2 className="size-3" />بازخورد صوتی در کپچر/ثبت</Label>
            </div>

            <div className="space-y-2 rounded-md border p-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-print" className="text-xs">چاپ خودکار لیبل پس از ثبت پایدار</Label>
                <Switch id="auto-print" checked={autoPrintLabel} onCheckedChange={setAutoPrintLabel} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">اندازه لیبل</Label>
                <Select value={labelSize} onValueChange={(value) => setLabelSize(value as "50x30" | "60x40") }>
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50x30">50x30</SelectItem>
                    <SelectItem value="60x40">60x40</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!lastStockInId}
                  onClick={() => lastStockInId && handlePrintLabels([lastStockInId])}
                >
                  چاپ تگ آخرین ورود
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>محصول *</Label>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => {
                  setValue("productId", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  const product = products.find(
                    (p) => p.id.toString() === value
                  );
                  setSelectedProduct(product || null);
                }}
                value={selectedProduct?.id.toString()}
              >
                <SelectTrigger
                  aria-label="انتخاب محصول"
                  className={cn(
                    errors.productId &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                >
                  <SelectValue placeholder="محصول را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                onClick={() => setShowScanner(!showScanner)}
                aria-label={
                  showScanner ? "بستن اسکنر بارکد" : "باز کردن اسکنر بارکد"
                }
              >
                <Scan className="size-4" />
              </Button>
            </div>
            {errors.productId && (
              <p className="text-sm text-destructive">
                {errors.productId.message}
              </p>
            )}
          </div>

          {showScanner && (
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              onStatusChange={setScannerStatus}
            />
          )}

          {showScanner && (
            <p
              className="text-xs text-center text-muted-foreground mb-2"
              role="status"
              aria-live="polite"
              id="scanner-status-live"
            >
              {scannerStatus === "scanning" && "در حال اسکن..."}
              {scannerStatus === "success" && "بارکد با موفقیت خوانده شد."}
              {scannerStatus === "error" &&
                "اسکنر در دسترس نیست؛ دسترسی دوربین را بررسی کنید."}
              {scannerStatus === "unknown" && "بارکد ناشناس ثبت شد؛ از صف بارکدهای ناشناس پیگیری کنید."}
              {scannerStatus === "duplicate" && "اسکن تکراری بارکد ناشناس نادیده گرفته شد."}
              {scannerStatus === "idle" &&
                "برای اسکن بارکد، دوربین را فعال کنید."}
            </p>
          )}

          {selectedProduct && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">
                <span className="font-medium">واحد:</span>{" "}
                {selectedProduct.unit}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">مقدار *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              {...register("quantity")}
              disabled={isLoading}
              dir="ltr"
              placeholder={
                selectedProduct
                  ? `مثال: 2.5 ${selectedProduct.unit}`
                  : "مثال: 2.5"
              }
              aria-invalid={!!errors.quantity}
              aria-describedby="quantity-hint quantity-error"
              className={cn(
                errors.quantity &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {errors.quantity && (
              <p id="quantity-error" className="text-sm text-destructive">
                {errors.quantity.message}
              </p>
            )}
            <p id="quantity-hint" className="text-xs text-muted-foreground">
              {selectedProduct
                ? `واحد انتخابی: ${selectedProduct.unit}. مثال: 2.5 ${selectedProduct.unit}`
                : "پس از انتخاب محصول، واحد و مثال ورود مقدار نمایش داده می‌شود."}
            </p>
            {packWeightDeviation !== null && expectedPackWeight !== null && packWeightDeviation > Math.max(expectedPackWeight * 0.15, tolerance) && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                هشدار: مقدار ثبت‌شده اختلاف زیادی با وزن مورد انتظار بسته دارد.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">تامین‌کننده</Label>
            <Input
              id="supplier"
              {...register("supplier")}
              disabled={isLoading}
              dir="rtl"
              placeholder="نام تامین‌کننده"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">شماره فاکتور</Label>
            <Input
              id="invoiceNumber"
              {...register("invoiceNumber")}
              disabled={isLoading}
              dir="ltr"
              placeholder="شماره فاکتور یا سند"
            />
          </div>

          <div className="space-y-2">
            <Label>نوع سند مبدا</Label>
            <Select
              value={sourceDocumentType || "none"}
              onValueChange={(value) => {
                setValue("sourceDocumentType", value === "none" ? "" : value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger aria-label="انتخاب نوع سند مبدا">
                <SelectValue placeholder="انتخاب نوع سند" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون سند</SelectItem>
                <SelectItem value="invoice">فاکتور</SelectItem>
                <SelectItem value="purchase-order">سفارش خرید</SelectItem>
                <SelectItem value="transfer-note">حواله انتقال</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceDocumentNumber">شماره سند مبدا</Label>
            <Input
              id="sourceDocumentNumber"
              {...register("sourceDocumentNumber")}
              disabled={isLoading}
              dir="ltr"
              placeholder="مثال: PO-1403-0082"
            />
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="size-4" />
              فیلدهای اختیاری دریافت
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lotBatch">لات / بچ</Label>
                <Input id="lotBatch" {...register("lotBatch")} placeholder="Lot-A12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">تاریخ انقضا</Label>
                <Input id="expiryDate" type="date" {...register("expiryDate")} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierLot">لات تامین‌کننده</Label>
                <Input id="supplierLot" {...register("supplierLot")} placeholder="SUP-LOT-44" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualityResult">نتیجه کنترل کیفیت</Label>
                <Input
                  id="qualityResult"
                  {...register("qualityResult")}
                  placeholder="قبول / مشروط / رد"
                />
              </div>
            </div>
          </div>

          {stockPreview && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <p>پیش‌نمایش موجودی</p>
              <p>
                موجودی فعلی: {stockPreview.current.toFixed(2)} {selectedProduct?.unit}
              </p>
              <p>
                پس از ورود: {stockPreview.after.toFixed(2)} {selectedProduct?.unit}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">یادداشت</Label>
            <textarea
              id="notes"
              {...register("notes")}
              disabled={isLoading}
              dir="rtl"
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="توضیحات تکمیلی..."
            />
          </div>

          <div className="hidden md:block">
            <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3" />
              آخرین زمان پایدار: {lastStableAt ? new Date(lastStableAt).toLocaleTimeString() : "-"}
              {!manualMode && isCapturedMeasurementStale && " · وزن کپچر شده قدیمی است"}
            </p>
            <Button
              type="submit"
              disabled={isSubmitDisabled || (!manualMode && isCapturedMeasurementStale)}
              className="w-full"
              aria-busy={isLoading}
            >
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              ثبت ورود کالا
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                if (!guard.confirmNavigation()) return;
                router.push("/dashboard/stock-in");
              }}
            >
              انصراف
            </Button>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
            <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3" />
              آخرین زمان پایدار: {lastStableAt ? new Date(lastStableAt).toLocaleTimeString() : "-"}
            </p>
            <Button
              type="submit"
              disabled={isSubmitDisabled || (!manualMode && isCapturedMeasurementStale)}
              className="w-full"
              aria-busy={isLoading}
            >
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              ثبت ورود کالا
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                if (!guard.confirmNavigation()) return;
                router.push("/dashboard/stock-in");
              }}
            >
              انصراف
            </Button>
          </div>
        </form>
      </CardContent>

      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>پیش‌نمایش چاپ لیبل</DialogTitle>
            <DialogDescription>
              پیش از باز شدن پنجره چاپ، خروجی را بررسی کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[420px] overflow-hidden rounded border">
            {pendingPrintHtml ? (
              <iframe title="print-preview" className="size-full" srcDoc={pendingPrintHtml} />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">پیش‌نمایشی در دسترس نیست.</div>
            )}
          </div>
          {isPopupBlocked && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Popup blocker فعال است. دسترسی popup را باز کنید و دوباره روی چاپ بزنید.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>بستن</Button>
            <Button type="button" onClick={executePrint} disabled={isPreparingPrint}>
              <ExternalLink className="ml-1 size-4" />
              چاپ در پنجره جدید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
