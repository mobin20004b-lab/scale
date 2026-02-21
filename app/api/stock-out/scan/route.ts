import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBarcodeForStockOut } from "@/lib/barcode-resolver";
import { runIdempotentOperation } from "@/lib/idempotency";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
  }

  const body = (await request.json()) as {
    barcode?: string;
    warehouseId?: string | null;
    autoCommit?: boolean;
    quantity?: number;
  };

  if (!body.barcode?.trim()) {
    return NextResponse.json({ error: "barcode is required" }, { status: 400 });
  }

  const result = await runIdempotentOperation("/api/stock-out/scan", idempotencyKey, async () => {
    const resolved = await resolveBarcodeForStockOut(body.barcode!);

    if (!resolved) {
      return {
        status: 404,
        body: { validation: "not_found", actionHint: "map_or_create", barcode: body.barcode },
      };
    }

    const product = await prisma.product.findUnique({ where: { id: resolved.productId } });
    if (!product) {
      return {
        status: 404,
        body: { validation: "product_not_found", actionHint: "map_or_create" },
      };
    }

    const requestedQuantity = Number(body.quantity ?? resolved.quantity ?? 1);

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      return {
        status: 400,
        body: { validation: "invalid_quantity", actionHint: "enter_quantity" },
      };
    }

    if (Number(product.currentStock) < requestedQuantity) {
      return {
        status: 409,
        body: {
          resolved: { productId: product.id, lotNumber: resolved.lotNumber },
          quantity: requestedQuantity,
          validation: "insufficient_stock",
          actionHint: "review_stock",
        },
      };
    }

    if (!body.autoCommit) {
      return {
        status: 200,
        body: {
          resolved: {
            productId: product.id,
            productName: product.name,
            barcodeType: resolved.kind,
            lotNumber: resolved.lotNumber,
          },
          quantity: requestedQuantity,
          validation: "ok",
          actionHint: resolved.kind === "product" ? "confirm_quantity" : "auto_fill",
        },
      };
    }

    const stockOut = await prisma.$transaction(async (tx) => {
      const created = await tx.stockOut.create({
        data: {
          productId: product.id,
          userId: (session.user as any).id,
          quantity: requestedQuantity,
          weight: requestedQuantity,
          warehouseId: body.warehouseId || null,
          notes: `scan:${resolved.barcode};type:${resolved.kind};lot:${resolved.lotNumber ?? "-"}`,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: { decrement: requestedQuantity } },
      });

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "خروج کالا با اسکن",
          entity: "StockOut",
          entityId: created.id,
          details: `${requestedQuantity} ${product.unit} از ${product.name} با بارکد ${resolved.barcode}`,
        },
      });

      return created;
    });

    return {
      status: 201,
      body: {
        id: stockOut.id,
        resolved: {
          productId: product.id,
          productName: product.name,
          barcodeType: resolved.kind,
          lotNumber: resolved.lotNumber,
        },
        quantity: requestedQuantity,
        validation: "ok",
        actionHint: "committed",
      },
    };
  });

  return NextResponse.json(result.body, { status: result.status });
}
