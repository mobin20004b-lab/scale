type ProductMovementProfile = {
  unit?: string | null;
};

const WEIGHT_UNITS = new Set([
  "kg",
  "kilogram",
  "kilograms",
  "g",
  "gram",
  "grams",
  "گرم",
  "کیلو",
  "کیلوگرم",
]);

function normalizeUnit(unit?: string | null) {
  return unit?.trim().toLowerCase() ?? "";
}

export function isWeightedProduct(product: ProductMovementProfile) {
  return WEIGHT_UNITS.has(normalizeUnit(product.unit));
}

export function resolveMovementQuantityAndWeight(
  product: ProductMovementProfile,
  requestedQuantity: number
) {
  if (isWeightedProduct(product)) {
    return {
      quantity: requestedQuantity,
      weight: requestedQuantity,
    };
  }

  return {
    quantity: requestedQuantity,
    weight: requestedQuantity,
  };
}
