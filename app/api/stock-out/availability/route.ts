import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWarehouseAvailableQuantity } from "@/lib/warehouse-stock";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim();
  const warehouseId = searchParams.get("warehouseId")?.trim();

  if (!productId || !warehouseId) {
    return NextResponse.json(
      { error: "productId and warehouseId are required" },
      { status: 400 }
    );
  }

  const available = await getWarehouseAvailableQuantity(prisma, {
    productId,
    warehouseId,
  });

  const balances = await prisma.warehouseInventoryBalance.findMany({
    where: {
      productId,
      warehouseId,
      quantity: { gt: 0 },
    },
    select: { lotBatch: true, quantity: true },
    orderBy: { updatedAt: "asc" },
  });

  const entryLots = await prisma.stockIn.findMany({
    where: {
      productId,
      warehouseId,
      lotBatch: { in: balances.map((b) => b.lotBatch) },
    },
    select: { id: true, lotBatch: true, quantity: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    productId,
    warehouseId,
    available,
    entryLots,
    refreshedAt: new Date().toISOString(),
  });
}
