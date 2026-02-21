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

    const stockIn = await prisma.stockIn.findUnique({
      where: { id: parsed.stockInId },
    });

    if (!stockIn) {
      return NextResponse.json({ error: "Entry lot not found" }, { status: 404 });
    }

    if (stockIn.productId !== parsed.productId || stockIn.warehouseId !== parsed.warehouseId) {
      return NextResponse.json(
        { error: "Selected entry lot does not belong to selected product/warehouse" },
        { status: 400 }
      );
    }

    const existingStockOut = await prisma.stockOut.findFirst({
      where: { stockInId: parsed.stockInId },
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

    const stockOut = await prisma.$transaction(async (tx) => {
      const createdStockOut = await tx.stockOut.create({
        data: {
          productId: parsed.productId,
          stockInId: parsed.stockInId,
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

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "خروج کالا",
          entity: "StockOut",
          entityId: createdStockOut.id,
          details: `${stockIn.quantity} ${product.unit} از "${product.name}" از انبار "${warehouse.name}" خارج شد (lot: ${stockIn.lotBatch})`,
        },
      });

      return createdStockOut;
    });

    return NextResponse.json(stockOut, { status: 201 });
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
