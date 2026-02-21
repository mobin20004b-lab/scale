import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { runIdempotentOperation } from "@/lib/idempotency";
import { externalStockOutPayloadSchema } from "@/lib/schemas/inventory";
import {
  decrementWarehouseInventory,
  InventoryConflictError,
} from "@/lib/inventory-ledger";
import { resolveMovementQuantityAndWeight } from "@/lib/movement-metrics";
import { requireExternalApiAuth } from "@/lib/external-api-auth";

export async function POST(request: Request) {
  try {
    const externalAuth = await requireExternalApiAuth(request);
    if ("error" in externalAuth) {
      return externalAuth.error;
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required" },
        { status: 400 }
      );
    }

    const parsed = externalStockOutPayloadSchema.parse(await request.json());

    const result = await runIdempotentOperation(
      "external-stock-out",
      idempotencyKey,
      async () => {
        const [product, warehouse] = await Promise.all([
          prisma.product.findUnique({ where: { id: parsed.productId } }),
          prisma.warehouse.findUnique({ where: { id: parsed.warehouseId } }),
        ]);

        if (!product) {
          return { status: 404, body: { error: "Product not found" } };
        }

        if (!warehouse) {
          return { status: 404, body: { error: "Warehouse not found" } };
        }

        const systemUser = await prisma.user.findFirst({
          where: { role: "ADMIN" },
        });

        if (!systemUser) {
          return { status: 500, body: { error: "System user not found" } };
        }

        try {
          const movement = resolveMovementQuantityAndWeight(
            product,
            parsed.quantity
          );

          const stockOut = await prisma.$transaction(async (tx) => {
            const createdStockOut = await tx.stockOut.create({
              data: {
                productId: parsed.productId,
                userId: systemUser.id,
                quantity: movement.quantity,
                weight: movement.weight,
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
                userId: systemUser.id,
                action: "خروج کالا (API)",
                entity: "StockOut",
                entityId: createdStockOut.id,
                details: `${parsed.quantity} ${product.unit} از "${product.name}" از طریق API خارج شد`,
              },
            });

            return createdStockOut;
          });

          return {
            status: 201,
            body: {
              success: true,
              message: "Stock out recorded successfully",
              stock_out: {
                id: stockOut.id,
                productId: stockOut.productId,
                quantity: Number(stockOut.quantity),
                createdAt: stockOut.createdAt,
              },
            },
          };
        } catch (error) {
          if (error instanceof InventoryConflictError) {
            return { status: 409, body: { error: error.message } };
          }

          throw error;
        }
      }
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("[v0] External API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
