export const PRODUCT_UNITS = [
  "قطعة",
  "بسته",
  "کارتن",
  "کیلوگرم",
  "گرم",
  "لیتر",
  "kg",
  "g",
  "pcs",
  "كيس",
  "علبة",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const PRODUCT_UNIT_SET = new Set<string>(PRODUCT_UNITS);
