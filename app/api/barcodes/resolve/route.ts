import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { unknownEventId, mode, productId } = await request.json();

  if (!unknownEventId || !mode) {
    return NextResponse.json({ error: "unknownEventId and mode are required" }, { status: 400 });
  }

  if (mode === "map" && !productId) {
    return NextResponse.json({ error: "productId is required for map mode" }, { status: 400 });
  }

  const status = mode === "temporary" ? "TEMP_RECEIVING" : "MAPPED";

  const updated = await prisma.unknownBarcodeEvent.update({
    where: { id: unknownEventId },
    data: {
      status,
      mappedProductId: productId || null,
      resolvedAt: new Date(),
      notes: mode === "temporary" ? "Temporary receiving item created" : "Mapped to existing product",
    },
  });

  return NextResponse.json(updated);
}
