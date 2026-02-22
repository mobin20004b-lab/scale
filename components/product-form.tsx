"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { productFormSchema } from "@/lib/schemas/inventory";
import { PRODUCT_UNITS } from "@/lib/product-units";
import { FormField } from "@/components/forms/form-field";
import {
  focusFirstInvalidField,
  FormErrorSummary,
  handleFormKeyboardNavigation,
  SaveState,
  SaveStatusInline,
  useFieldA11y,
  useUnsavedChangesGuard,
} from "@/components/forms/form-utils";

type ProductFormData = import("zod").infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: any;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedLabelData, setLastSavedLabelData] = useState<{
    name: string;
    sku: string;
    barcode?: string | null;
  } | null>(null);
  const [skuValidation, setSkuValidation] = useState<
    "idle" | "checking" | "unique" | "duplicate"
  >("idle");
  const [barcodeValidation, setBarcodeValidation] = useState<
    "idle" | "checking" | "unique" | "duplicate"
  >("idle");
  const [imagePreview, setImagePreview] = useState<string>(
    product?.imageUrl || ""
  );
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty, touchedFields },
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    mode: "onChange",
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku || "",
          barcode: product.barcode || "",
          barcodeAliases: (product.barcodes || [])
            .map((b: any) => b.code)
            .join(", "),
          barcodeIssuer: "",
          category: product.category || "",
          unit: product.unit,
          minStock: product.minStock.toString(),
          imageUrl: product.imageUrl || "",
          description: product.description || "",
        }
      : {
          unit: "کیلوگرم",
          imageUrl: "",
          barcodeAliases: "",
          barcodeIssuer: "",
        },
  });

  const guard = useUnsavedChangesGuard(isDirty && !isLoading);
  const errorList = useMemo(
    () =>
      Object.values(errors).flatMap((error) =>
        error?.message ? [error.message] : []
      ),
    [errors]
  );

  const nameA11y = useFieldA11y(errors.name?.message);
  const unitA11y = useFieldA11y(
    errors.unit?.message,
    "مثال: کیلوگرم، گرم، لیتر"
  );
  const minStockA11y = useFieldA11y(
    errors.minStock?.message,
    "مثال: 10.5 (حداقل موجودی قبل از هشدار)"
  );

  const watchedSku = watch("sku");
  const watchedBarcode = watch("barcode");

  useEffect(() => {
    const value = (watchedSku || "").trim();
    if (!value) {
      setSkuValidation("idle");
      return;
    }

    const timeout = setTimeout(async () => {
      setSkuValidation("checking");
      const params = new URLSearchParams({ sku: value });
      if (product?.id) params.set("excludeId", product.id);
      const response = await fetch(
        `/api/products/validate?${params.toString()}`
      );
      const payload = await response.json().catch(() => null);
      setSkuValidation(payload?.sku?.exists ? "duplicate" : "unique");
    }, 350);

    return () => clearTimeout(timeout);
  }, [watchedSku, product?.id]);

  useEffect(() => {
    const value = (watchedBarcode || "").trim();
    if (!value) {
      setBarcodeValidation("idle");
      return;
    }

    const timeout = setTimeout(async () => {
      setBarcodeValidation("checking");
      const params = new URLSearchParams({ barcode: value });
      if (product?.id) params.set("excludeId", product.id);
      const response = await fetch(
        `/api/products/validate?${params.toString()}`
      );
      const payload = await response.json().catch(() => null);
      setBarcodeValidation(payload?.barcode?.exists ? "duplicate" : "unique");
    }, 350);

    return () => clearTimeout(timeout);
  }, [watchedBarcode, product?.id]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setImagePreview(dataUrl);
      setValue("imageUrl", dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePrintLabel = () => {
    if (!lastSavedLabelData) return;

    const labelWindow = window.open("", "_blank", "width=480,height=320");
    if (!labelWindow) return;

    labelWindow.document.write(`
      <html lang="fa">
        <head>
          <title>Product Label</title>
          <style>
            body { font-family: sans-serif; padding: 20px; direction: rtl; }
            .label { border: 1px solid #000; border-radius: 8px; padding: 16px; }
            h2 { margin: 0 0 12px; font-size: 18px; }
            p { margin: 6px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="label">
            <h2>${lastSavedLabelData.name}</h2>
            <p>SKU: ${lastSavedLabelData.sku}</p>
            <p>Barcode: ${lastSavedLabelData.barcode || "-"}</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    labelWindow.document.close();
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    setSaveState("saving");
    const toastId = toast.loading("Saving...", { duration: Infinity });

    try {
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          minStock: parseFloat(data.minStock),
          barcodeAliases: (data.barcodeAliases || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          barcodeIssuer: data.barcodeIssuer || undefined,
        }),
      });

      if (response.ok) {
        const savedProduct = await response.json();
        setLastSavedLabelData({
          name: savedProduct.name ?? data.name,
          sku: savedProduct.sku ?? data.sku ?? "-",
          barcode: savedProduct.barcode ?? data.barcode ?? null,
        });
        setSaveState("saved");
        toast.success("Saved", { id: toastId, duration: 5000 });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>اطلاعات محصول</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          onSubmit={handleSubmit(onSubmit, () =>
            focusFirstInvalidField(formRef.current)
          )}
          onKeyDown={(event) => handleFormKeyboardNavigation(event)}
          className="space-y-4 pb-24 md:pb-0"
          aria-busy={isLoading}
        >
          <FormErrorSummary errors={errorList} />
          <SaveStatusInline
            state={saveState}
            action={
              saveState === "saved" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrintLabel}
                >
                  چاپ لیبل
                </Button>
              ) : null
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id={nameA11y.inputId}
              label="نام محصول"
              required
              error={errors.name?.message}
              success={!!touchedFields.name && !errors.name && !!watch("name")}
              errorId={nameA11y.errorId}
            >
              <Input
                id={nameA11y.inputId}
                {...register("name")}
                disabled={isLoading}
                dir="rtl"
                aria-invalid={!!errors.name}
                aria-describedby={nameA11y.describedBy || undefined}
              />
            </FormField>

            <FormField id="sku" label="کد محصول (SKU)">
              <Input
                id="sku"
                {...register("sku")}
                disabled={isLoading}
                dir="ltr"
              />
              {skuValidation === "checking" && (
                <p className="text-xs text-muted-foreground mt-1">
                  در حال بررسی یکتا بودن...
                </p>
              )}
              {skuValidation === "duplicate" && (
                <p className="text-xs text-destructive mt-1">
                  این SKU قبلاً ثبت شده است.
                </p>
              )}
              {skuValidation === "unique" && (
                <p className="text-xs text-emerald-600 mt-1">
                  SKU قابل استفاده است.
                </p>
              )}
            </FormField>

            <FormField id="barcode" label="بارکد">
              <Input
                id="barcode"
                {...register("barcode")}
                disabled={isLoading}
                dir="ltr"
              />
              {barcodeValidation === "checking" && (
                <p className="text-xs text-muted-foreground mt-1">
                  در حال بررسی یکتا بودن...
                </p>
              )}
              {barcodeValidation === "duplicate" && (
                <p className="text-xs text-destructive mt-1">
                  این بارکد قبلاً ثبت شده است.
                </p>
              )}
              {barcodeValidation === "unique" && (
                <p className="text-xs text-emerald-600 mt-1">
                  بارکد قابل استفاده است.
                </p>
              )}
            </FormField>

            <FormField id="barcodeAliases" label="بارکدهای جایگزین">
              <Input
                id="barcodeAliases"
                {...register("barcodeAliases")}
                disabled={isLoading}
                dir="ltr"
                placeholder="alias1, alias2"
              />
            </FormField>

            <FormField id="barcodeIssuer" label="صادرکننده بارکد">
              <Input
                id="barcodeIssuer"
                {...register("barcodeIssuer")}
                disabled={isLoading}
                dir="rtl"
                placeholder="داخلی / تامین‌کننده"
              />
            </FormField>

            <FormField id="category" label="دسته‌بندی">
              <Input
                id="category"
                {...register("category")}
                disabled={isLoading}
                dir="rtl"
              />
            </FormField>

            <FormField
              id={unitA11y.inputId}
              label="واحد اندازه‌گیری"
              required
              helperText="از لیست واحدهای مجاز انتخاب کنید"
              error={errors.unit?.message}
              success={!!touchedFields.unit && !errors.unit && !!watch("unit")}
              hintId={unitA11y.hintId}
              errorId={unitA11y.errorId}
            >
              <Select
                value={watch("unit")}
                onValueChange={(value) =>
                  setValue("unit", value as ProductFormData["unit"], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                disabled={isLoading}
              >
                <SelectTrigger
                  id={unitA11y.inputId}
                  aria-invalid={!!errors.unit}
                  aria-describedby={unitA11y.describedBy}
                >
                  <SelectValue placeholder="واحد را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id={minStockA11y.inputId}
              label="حداقل موجودی (آستانه هشدار)"
              required
              helperText="مثال: 10.5 (واحد محصول)"
              error={errors.minStock?.message}
              success={
                !!touchedFields.minStock &&
                !errors.minStock &&
                !!watch("minStock")
              }
              hintId={minStockA11y.hintId}
              errorId={minStockA11y.errorId}
            >
              <Input
                id={minStockA11y.inputId}
                type="number"
                step="0.01"
                {...register("minStock")}
                disabled={isLoading}
                dir="ltr"
                placeholder="10.5"
                aria-invalid={!!errors.minStock}
                aria-describedby={minStockA11y.describedBy}
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="productImage" label="تصویر محصول (اختیاری)">
              <div className="space-y-2">
                <Input
                  id="productImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isLoading}
                />
                <input type="hidden" {...register("imageUrl")} />
                {imagePreview && (
                  <div className="rounded-md border p-2 max-w-[220px]">
                    <Image
                      src={imagePreview}
                      alt="preview"
                      width={220}
                      height={160}
                      className="w-full h-40 object-cover rounded"
                      unoptimized
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Upload className="size-3" />
                  آپلود تصویر با پیش‌نمایش فوری. (برش دستی در این نسخه پشتیبانی
                  نمی‌شود)
                </p>
              </div>
            </FormField>
          </div>

          <FormField id="description" label="توضیحات">
            <textarea
              id="description"
              {...register("description")}
              disabled={isLoading}
              dir="rtl"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="توضیحات تکمیلی درباره محصول..."
            />
          </FormField>

          <div className="hidden gap-3 md:flex">
            <Button type="submit" disabled={isLoading} aria-busy={isLoading}>
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              {product ? "ذخیره تغییرات" : "ثبت محصول"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!guard.confirmNavigation()) return;
                router.push("/dashboard/products");
              }}
              disabled={isLoading || guard.isConfirmingNavigation}
            >
              انصراف
            </Button>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
                {product ? "ذخیره تغییرات" : "ثبت محصول"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!guard.confirmNavigation()) return;
                  router.push("/dashboard/products");
                }}
                disabled={isLoading || guard.isConfirmingNavigation}
                className="flex-1"
              >
                انصراف
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
