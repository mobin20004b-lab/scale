import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { stockOutPayloadSchema } from "@/lib/schemas/inventory";
import { decrementWarehouseInventory, InventoryConflictError } from "@/lib/inventory-ledger";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = stockOutPayloadSchema.parse(await request.json());

    const warehouse = await prisma.warehouse.findUnique({ where: { id: parsed.warehouseId } });
    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({ where: { id: parsed.productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const stockOut = await prisma.$transaction(async (tx) => {
      const createdStockOut = await tx.stockOut.create({
        data: {
          productId: parsed.productId,
          userId: (session.user as any).id,
          quantity: parsed.quantity,
          weight: parsed.quantity,
          customer: parsed.customer,
          invoiceNumber: parsed.invoiceNumber,
          notes: parsed.notes,
          warehouseId: parsed.warehouseId,
        },
      });

      await decrementWarehouseInventory(tx, {
        productId: parsed.productId,
        warehouseId: parsed.warehouseId,
        quantity: parsed.quantity,
        stockOutId: createdStockOut.id,
        notes: parsed.notes,
      });

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "خروج کالا",
          entity: "StockOut",
          entityId: createdStockOut.id,
          details: `${parsed.quantity} ${product.unit} از "${product.name}" از انبار "${warehouse.name}" خارج شد`,
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
    return NextResponse.json({ error: "Failed to create stock out" }, { status: 500 });
  }
}
