import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeBarcode } from "@/lib/barcode";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { barcode } = await request.json();
  const normalized = normalizeBarcode(String(barcode || ""));
  if (!normalized.normalized) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { barcode: normalized.normalized },
        { barcodes: { some: { code: normalized.normalized, status: "ACTIVE" } } },
      ],
    },
    include: {
      stockIns: { orderBy: { createdAt: "desc" }, take: 1 },
      stockOuts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const lastIn = product.stockIns[0] ?? null;
  const lastOut = product.stockOuts[0] ?? null;
  const lastMovement = [lastIn, lastOut].filter(Boolean).sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt))[0] || null;

  return NextResponse.json({
    stockLookup: {
      productId: product.id,
      productName: product.name,
      currentStock: product.currentStock,
      unit: product.unit,
    },
    stockOutDraft: {
      productId: product.id,
    },
    lastMovement,
  });
}
