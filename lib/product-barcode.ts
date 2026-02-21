import { normalizeBarcode } from "@/lib/barcode";

interface BarcodeAlias {
  code: string;
  status?: "ACTIVE" | "RETIRED";
}

interface ProductWithBarcode {
  id: string;
  name: string;
  barcode?: string | null;
  barcodes?: BarcodeAlias[];
}

export function findProductByScannedBarcode<T extends ProductWithBarcode>(
  products: T[],
  rawBarcode: string,
) {
  const normalized = normalizeBarcode(rawBarcode).normalized;

  return products.find((product) => {
    if (normalizeBarcode(product.barcode || "").normalized === normalized) {
      return true;
    }

    return (product.barcodes || []).some(
      (alias) => alias.status !== "RETIRED" && normalizeBarcode(alias.code).normalized === normalized,
    );
  });
}
