"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatPersianDate } from "@/lib/date-time";
import {
  AlertTriangle,
  CalendarIcon,
  Copy,
  Download,
  Loader2,
  RefreshCcw,
  Save,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";

interface Product {
  id: string;
  name: string;
}

interface ReportsFiltersProps {
  products: Product[];
  initialStartDate: string;
  initialEndDate: string;
  initialProductId?: string;
  initialType: string;
  timeZoneLabel: string;
  currentRowsCount: number;
}

type SavedPreset = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  productId: string;
  type: string;
};

const STORAGE_KEY = "reports-saved-presets-v1";
const LARGE_EXPORT_THRESHOLD = 5000;

function toDate(value: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function DatePickerField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedDate = toDate(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-between text-right font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            {selectedDate ? formatPersianDate(selectedDate) : "انتخاب تاریخ"}
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) =>
              onChange(date ? format(date, "yyyy-MM-dd") : "")
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ReportsFilters({
  products,
  initialStartDate,
  initialEndDate,
  initialProductId,
  initialType,
  timeZoneLabel,
  currentRowsCount,
}: ReportsFiltersProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [productId, setProductId] = useState(initialProductId || "all");
  const [type, setType] = useState(initialType);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (productId && productId !== "all") params.set("productId", productId);
    if (type) params.set("type", type);
    return params.toString();
  }, [endDate, productId, startDate, type]);

  const applyFilters = () => {
    router.push(`/dashboard/reports?${queryString}`);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      applyFilters();
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as SavedPreset[];
      setSavedPresets(parsed);
    } catch {
      setSavedPresets([]);
    }
  }, []);

  const persistPresets = (next: SavedPreset[]) => {
    setSavedPresets(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveCurrentPreset = () => {
    const label = window.prompt("نام پیش‌فرض گزارش را وارد کنید")?.trim();
    if (!label) return;

    const nextPreset: SavedPreset = {
      id: crypto.randomUUID(),
      label,
      startDate,
      endDate,
      productId,
      type,
    };

    const next = [nextPreset, ...savedPresets].slice(0, 10);
    persistPresets(next);
    toast.success("پیش‌فرض گزارش ذخیره شد");
  };

  const applySavedPreset = (presetId: string) => {
    if (presetId === "builtin-month") {
      setType("all");
      setProductId("all");
      return;
    }

    const preset = savedPresets.find((item) => item.id === presetId);
    if (!preset) return;

    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setProductId(preset.productId);
    setType(preset.type);
    toast.success(`پیش‌فرض «${preset.label}» اعمال شد`);
  };

  const copyShareableUrl = async () => {
    const url = `${window.location.origin}/dashboard/reports?${queryString}`;
    await navigator.clipboard.writeText(url);
    toast.success("لینک اشتراک‌گذاری کپی شد");
  };

  const handleExport = async () => {
    setExportError(null);
    setIsExporting(true);
    setExportProgress(10);

    const step = window.setInterval(() => {
      setExportProgress((prev) => (prev >= 90 ? prev : prev + 15));
    }, 250);

    try {
      const response = await fetch(`/api/reports/export?${queryString}`);
      setExportProgress(95);

      if (!response.ok) {
        throw new Error("دانلود گزارش انجام نشد");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `warehouse-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportProgress(100);
      toast.success("گزارش با موفقیت دانلود شد");
    } catch {
      setExportError(
        "خطا در دانلود گزارش. اتصال شبکه یا فیلترها را بررسی کنید."
      );
      toast.error("خطا در دانلود گزارش");
    } finally {
      window.clearInterval(step);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 350);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 text-xs text-muted-foreground">
          بازه‌ها بر اساس منطقه زمانی فعال: {timeZoneLabel}
        </div>

        {currentRowsCount > LARGE_EXPORT_THRESHOLD && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="size-4 text-amber-600" />
            این گزارش {currentRowsCount.toLocaleString("fa-IR")} ردیف دارد و
            خروجی ممکن است زمان‌بر باشد.
          </div>
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>پیش‌فرض‌های گزارش</Label>
            <Select onValueChange={applySavedPreset}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب پیش‌فرض" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="builtin-month">
                  حالت ماه جاری (پیش‌فرض)
                </SelectItem>
                {savedPresets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={saveCurrentPreset}
              className="w-full sm:w-auto"
            >
              <Save className="ml-2 size-4" />
              ذخیره پیش‌فرض فعلی
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={copyShareableUrl}
              className="w-full sm:w-auto"
            >
              <Copy className="ml-2 size-4" />
              کپی لینک گزارش
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <DatePickerField
            id="startDate"
            label="از تاریخ"
            value={startDate}
            onChange={setStartDate}
          />

          <DatePickerField
            id="endDate"
            label="تا تاریخ"
            value={endDate}
            onChange={setEndDate}
          />

          <div className="space-y-2">
            <Label>محصول</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="همه محصولات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه محصولات</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>نوع عملیات</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="in">ورودی</SelectItem>
                <SelectItem value="out">خروجی</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="w-full"
              disabled={isExporting}
              aria-busy={isExporting}
            >
              {isExporting ? (
                <Loader2 className="size-4 ml-2 animate-spin" />
              ) : (
                <Download className="size-4 ml-2" />
              )}
              دانلود
            </Button>
          </div>
        </div>

        {isExporting && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>در حال آماده‌سازی و تولید فایل خروجی</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} />
          </div>
        )}

        {exportError && (
          <Empty className="mt-4 border border-destructive/40 bg-destructive/5 p-4 md:p-5">
            <EmptyHeader className="max-w-full">
              <EmptyMedia
                variant="icon"
                className="bg-destructive/10 text-destructive"
              >
                <TriangleAlert className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="text-base">
                دانلود گزارش با خطا مواجه شد
              </EmptyTitle>
              <EmptyDescription>{exportError}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={handleExport}
                className="w-full sm:w-auto"
              >
                <RefreshCcw className="size-4 ml-2" />
                تلاش مجدد دانلود
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
