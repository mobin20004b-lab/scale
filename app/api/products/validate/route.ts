import { NextResponse } from "next/server";
import { requireSession } from "@/lib/route-guards";
import { prisma } from "@/lib/prisma";
import { normalizeBarcode } from "@/lib/barcode";

export async function GET(request: Request) {
  const guard = await requireSession();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku")?.trim();
  const barcodeRaw = searchParams.get("barcode")?.trim();
  const excludeId = searchParams.get("excludeId")?.trim();

  const barcode = barcodeRaw ? normalizeBarcode(barcodeRaw).normalized : null;

  const [skuExists, barcodeExists] = await Promise.all([
    sku
      ? prisma.product.findFirst({ where: { sku, id: excludeId ? { not: excludeId } : undefined }, select: { id: true } })
      : null,
    barcode
      ? prisma.product.findFirst({ where: { barcode, id: excludeId ? { not: excludeId } : undefined }, select: { id: true } })
      : null,
  ]);

  return NextResponse.json({
    sku: { exists: Boolean(skuExists) },
    barcode: { exists: Boolean(barcodeExists) },
  });
}
