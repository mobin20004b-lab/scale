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

  return NextResponse.json({
    productId,
    warehouseId,
    available,
    refreshedAt: new Date().toISOString(),
  });
}
