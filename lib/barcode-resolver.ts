import { prisma } from "@/lib/prisma";
import { normalizeBarcode } from "@/lib/barcode";

export type ResolvedBarcode = {
  kind: "package" | "lot" | "product";
  productId: string;
  quantity: number | null;
  lotNumber: string | null;
  barcode: string;
};

export async function resolveBarcodeForStockOut(rawBarcode: string): Promise<ResolvedBarcode | null> {
  const normalized = normalizeBarcode(rawBarcode).normalized;

  const [code, qtyPart] = normalized.split("*");
  const encodedQty = qtyPart ? Number(qtyPart) : null;
  if (encodedQty && Number.isFinite(encodedQty) && encodedQty > 0) {
    const byPackage = await prisma.productBarcode.findFirst({
      where: {
        code,
        status: "ACTIVE",
        identifierType: "PACKAGE_DYNAMIC",
      },
    });

    if (byPackage) {
      return {
        kind: "package",
        productId: byPackage.productId,
        quantity: encodedQty,
        lotNumber: null,
        barcode: code,
      };
    }
  }

  const byLot = await prisma.productBarcode.findFirst({
    where: {
      code,
      status: "ACTIVE",
      identifierType: "LOT_DYNAMIC",
    },
  });

  if (byLot) {
    return {
      kind: "lot",
      productId: byLot.productId,
      quantity: null,
      lotNumber: code,
      barcode: code,
    };
  }

  const productByAlias = await prisma.productBarcode.findFirst({
    where: {
      code: normalized,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (productByAlias) {
    return {
      kind: "product",
      productId: productByAlias.productId,
      quantity: null,
      lotNumber: null,
      barcode: normalized,
    };
  }

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ barcode: normalized }, { sku: normalized }],
    },
  });

  if (!product) return null;

  return {
    kind: "product",
    productId: product.id,
    quantity: null,
    lotNumber: null,
    barcode: normalized,
  };
}
