import { z } from "zod";

const requiredText = (message: string) =>
  z.string().trim().min(1, message);

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

export const productFormSchema = z.object({
  name: requiredText("نام محصول الزامی است"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  unit: requiredText("واحد اندازه‌گیری الزامی است"),
  minStock: z
    .string()
    .refine((value) => value.trim().length > 0, "حداقل موجودی الزامی است")
    .refine((value) => !Number.isNaN(Number(value)), "حداقل موجودی باید عددی باشد")
    .refine((value) => Number(value) >= 0, "حداقل موجودی باید مثبت باشد"),
  weightPerUnit: z
    .string()
    .refine((value) => value.trim().length > 0, "وزن هر واحد الزامی است")
    .refine((value) => !Number.isNaN(Number(value)), "وزن هر واحد باید عددی باشد")
    .refine((value) => Number(value) >= 0, "وزن هر واحد باید مثبت باشد"),
  description: z.string().optional(),
});

export const productPayloadSchema = z.object({
  name: requiredText("نام محصول الزامی است"),
  sku: optionalText,
  barcode: optionalNullableText,
  category: optionalText,
  unit: requiredText("واحد اندازه‌گیری الزامی است"),
  minStock: z.coerce.number().min(0, "حداقل موجودی باید مثبت باشد"),
  weightPerUnit: z.coerce.number().min(0, "وزن هر واحد باید مثبت باشد"),
  description: optionalNullableText,
});

const stockMovementBase = {
  productId: requiredText("محصول را انتخاب کنید"),
  quantity: positiveNumberString,
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
};

export const stockInFormSchema = z.object({
  ...stockMovementBase,
  supplier: z.string().optional(),
  sourceDocumentType: z.string().optional(),
  sourceDocumentNumber: z.string().optional(),
  lotBatch: z.string().optional(),
  expiryDate: z.string().optional(),
  supplierLot: z.string().optional(),
  qualityResult: z.string().optional(),
});

export const stockOutFormSchema = z.object({
  ...stockMovementBase,
  customer: z.string().optional(),
});

export const stockInPayloadSchema = z.object({
  productId: requiredText("محصول را انتخاب کنید"),
  quantity: z.coerce.number().positive("مقدار باید بیشتر از صفر باشد"),
  supplier: optionalNullableText,
  invoiceNumber: optionalNullableText,
  notes: optionalNullableText,
  warehouseId: z.string().trim().optional().nullable(),
  scaleId: z.string().trim().optional().nullable(),
  scaleWeight: z.coerce.number().optional().nullable(),
  sourceDocumentType: optionalNullableText,
  sourceDocumentNumber: optionalNullableText,
  lotBatch: optionalNullableText,
  expiryDate: optionalNullableText,
  supplierLot: optionalNullableText,
  qualityResult: optionalNullableText,
});

export const stockOutPayloadSchema = z.object({
  productId: requiredText("محصول را انتخاب کنید"),
  quantity: z.coerce.number().positive("مقدار باید بیشتر از صفر باشد"),
  customer: optionalNullableText,
  invoiceNumber: optionalNullableText,
  notes: optionalNullableText,
  warehouseId: z.string().trim().optional().nullable(),
});

export const externalStockInPayloadSchema = stockInPayloadSchema.pick({
  productId: true,
  quantity: true,
  supplier: true,
  invoiceNumber: true,
  notes: true,
});

export const externalStockOutPayloadSchema = stockOutPayloadSchema;
