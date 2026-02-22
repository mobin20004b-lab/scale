import { z } from "zod";
import { PRODUCT_UNITS } from "@/lib/product-units";

const requiredText = (message: string) => z.string().trim().min(1, message);

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const optionalNullableText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);

export const positiveNumberString = z
  .string()
  .refine((value) => value.trim().length > 0, "مقدار را وارد کنید")
  .refine((value) => !Number.isNaN(Number(value)), "مقدار باید عددی باشد")
  .refine((value) => Number(value) > 0, "مقدار باید بیشتر از صفر باشد");

const productUnitEnum = z.enum(PRODUCT_UNITS, {
  errorMap: () => ({ message: "واحد اندازه‌گیری نامعتبر است" }),
});

export const productFormSchema = z.object({
  name: requiredText("نام محصول الزامی است"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  barcodeAliases: z.string().optional(),
  barcodeIssuer: z.string().optional(),
  category: z.string().optional(),
  unit: productUnitEnum,
  minStock: z
    .string()
    .refine((value) => value.trim().length > 0, "حداقل موجودی الزامی است")
    .refine(
      (value) => !Number.isNaN(Number(value)),
      "حداقل موجودی باید عددی باشد"
    )
    .refine((value) => Number(value) >= 0, "حداقل موجودی باید مثبت باشد"),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
});

export const productPayloadSchema = z.object({
  name: requiredText("نام محصول الزامی است"),
  sku: optionalText,
  barcode: optionalNullableText,
  barcodeAliases: z.array(z.string().trim()).optional().default([]),
  barcodeIssuer: optionalNullableText,
  category: optionalText,
  unit: productUnitEnum,
  minStock: z.coerce.number().min(0, "حداقل موجودی باید مثبت باشد"),
  imageUrl: optionalNullableText,
  description: optionalNullableText,
});

const stockMovementBase = {
  productId: requiredText("محصول را انتخاب کنید"),
  quantity: positiveNumberString,
};

export const stockInFormSchema = z.object({
  ...stockMovementBase,
  lotBatch: z.string().optional(),
});

export const stockOutFormSchema = z.object({
  productId: requiredText("محصول را انتخاب کنید"),
  warehouseId: requiredText("انبار را انتخاب کنید"),
  stockInIds: z
    .array(requiredText("یک ورودی را انتخاب کنید"))
    .min(1, "حداقل یک ورودی را انتخاب کنید"),
});

export const stockInPayloadSchema = z.object({
  productId: requiredText("محصول را انتخاب کنید"),
  quantity: z.coerce.number().positive("مقدار باید بیشتر از صفر باشد"),
  warehouseId: z.string().trim().optional().nullable(),
  scaleId: z.string().trim().optional().nullable(),
  scaleWeight: z.coerce.number().optional().nullable(),
  capturedAt: z.string().datetime().optional().nullable(),
  stableWindowMs: z.coerce.number().int().positive().optional().nullable(),
  sourceScaleId: z.string().trim().optional().nullable(),
  confidence: z.coerce.number().min(0).max(1).optional().nullable(),
  captureSource: z
    .enum(["current", "stable-average", "auto", "locked", "manual"])
    .optional()
    .nullable(),
});

export const stockOutPayloadSchema = z
  .object({
    productId: requiredText("محصول را انتخاب کنید"),
    warehouseId: requiredText("انبار را انتخاب کنید"),
    stockInId: requiredText("یک ورودی را انتخاب کنید").optional(),
    stockInIds: z.array(requiredText("یک ورودی را انتخاب کنید")).optional(),
  })
  .superRefine((data, ctx) => {
    const selectedIds = data.stockInIds?.filter(Boolean) ?? [];

    if (!data.stockInId && selectedIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stockInIds"],
        message: "حداقل یک ورودی را انتخاب کنید",
      });
    }
  });

export const externalStockInPayloadSchema = stockInPayloadSchema.pick({
  productId: true,
  quantity: true,
  warehouseId: true,
});

export const externalStockOutPayloadSchema = stockOutPayloadSchema;
