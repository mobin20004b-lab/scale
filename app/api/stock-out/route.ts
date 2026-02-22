import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { stockOutPayloadSchema } from "@/lib/schemas/inventory";
import {
  decrementWarehouseInventory,
  InventoryConflictError,
} from "@/lib/inventory-ledger";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = stockOutPayloadSchema.parse(await request.json());
    const selectedStockInIds = Array.from(
      new Set((parsed.stockInIds?.length ? parsed.stockInIds : parsed.stockInId ? [parsed.stockInId] : []).filter(Boolean))
    );

    const stockIns = await prisma.stockIn.findMany({
      where: { id: { in: selectedStockInIds } },
      orderBy: { createdAt: "asc" },
    });

    if (stockIns.length !== selectedStockInIds.length) {
      return NextResponse.json({ error: "One or more entry lots were not found" }, { status: 404 });
    }

    const hasMismatchedLot = stockIns.some(
      (stockIn) => stockIn.productId !== parsed.productId || stockIn.warehouseId !== parsed.warehouseId
    );

    if (hasMismatchedLot) {
      return NextResponse.json(
        { error: "Selected entry lot does not belong to selected product/warehouse" },
        { status: 400 }
      );
    }

    const existingStockOut = await prisma.stockOut.findFirst({
      where: { stockInId: { in: selectedStockInIds } },
      select: { stockInId: true },
    });

    if (existingStockOut) {
      return NextResponse.json({ error: "Selected entry lot has already been exited" }, { status: 409 });
    }

    const [warehouse, product] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: parsed.warehouseId } }),
      prisma.product.findUnique({ where: { id: parsed.productId } }),
    ]);

    if (!warehouse || !product) {
      return NextResponse.json({ error: "Warehouse or product not found" }, { status: 404 });
    }

    const createdStockOuts = await prisma.$transaction(async (tx) => {
      const stockOutRows = [];

      for (const stockIn of stockIns) {
        const createdStockOut = await tx.stockOut.create({
          data: {
            productId: parsed.productId,
            stockInId: stockIn.id,
            userId: (session.user as any).id,
            quantity: stockIn.quantity,
            weight: stockIn.weight,
            warehouseId: parsed.warehouseId,
          },
        });

        await decrementWarehouseInventory(tx, {
          productId: parsed.productId,
          warehouseId: parsed.warehouseId,
          quantity: stockIn.quantity,
          lotBatch: stockIn.lotBatch,
          stockOutId: createdStockOut.id,
        });

        stockOutRows.push(createdStockOut);
      }

      const totalQuantity = stockIns.reduce((sum, stockIn) => sum + Number(stockIn.quantity), 0);
      const lotSummary = stockIns.map((stockIn) => stockIn.lotBatch).join(", ");

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "خروج کالا",
          entity: "StockOut",
          entityId: stockOutRows[0].id,
          details: `${totalQuantity} ${product.unit} از "${product.name}" از انبار "${warehouse.name}" خارج شد (lots: ${lotSummary})`,
        },
      });

      return stockOutRows;
    });

    return NextResponse.json({
      stockOuts: createdStockOuts,
      count: createdStockOuts.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof InventoryConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("[v0] Error creating stock out:", error);
    return NextResponse.json(
      { error: "Failed to create stock out" },
      { status: 500 }
    );
  }
}
