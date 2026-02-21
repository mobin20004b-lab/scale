"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { productFormSchema } from "@/lib/schemas/inventory";
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
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
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
          category: product.category || "",
          unit: product.unit,
          minStock: product.minStock.toString(),
          weightPerUnit: product.weightPerUnit?.toString() || "",
          description: product.description || "",
        }
      : {
          unit: "کیلوگرم",
          weightPerUnit: "",
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
  const weightA11y = useFieldA11y(
    errors.weightPerUnit?.message,
    "مثال: 250 (گرم برای هر واحد)"
  );

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
          weightPerUnit: parseFloat(data.weightPerUnit),
        }),
      });

      if (response.ok) {
        setSaveState("saved");
        toast.success("Saved", { id: toastId, duration: 5000 });
        router.push("/dashboard/products");
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
          <SaveStatusInline state={saveState} />

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
            </FormField>

            <FormField id="barcode" label="بارکد">
              <Input
                id="barcode"
                {...register("barcode")}
                disabled={isLoading}
                dir="ltr"
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
              helperText="مثال: کیلوگرم، گرم، لیتر"
              error={errors.unit?.message}
              success={!!touchedFields.unit && !errors.unit && !!watch("unit")}
              hintId={unitA11y.hintId}
              errorId={unitA11y.errorId}
            >
              <Input
                id={unitA11y.inputId}
                {...register("unit")}
                disabled={isLoading}
                dir="rtl"
                placeholder="کیلوگرم"
                aria-invalid={!!errors.unit}
                aria-describedby={unitA11y.describedBy}
              />
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

            <FormField
              id={weightA11y.inputId}
              label="وزن هر واحد (گرم)"
              required
              helperText="مثال: 250 گرم"
              error={errors.weightPerUnit?.message}
              success={
                !!touchedFields.weightPerUnit &&
                !errors.weightPerUnit &&
                !!watch("weightPerUnit")
              }
              hintId={weightA11y.hintId}
              errorId={weightA11y.errorId}
            >
              <Input
                id={weightA11y.inputId}
                type="number"
                step="0.01"
                {...register("weightPerUnit")}
                disabled={isLoading}
                dir="ltr"
                placeholder="250"
                aria-invalid={!!errors.weightPerUnit}
                aria-describedby={weightA11y.describedBy}
              />
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
