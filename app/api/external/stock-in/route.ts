import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { runIdempotentOperation } from "@/lib/idempotency";
import { externalStockInPayloadSchema } from "@/lib/schemas/inventory";
import { incrementWarehouseInventory } from "@/lib/inventory-ledger";
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

    const parsed = externalStockInPayloadSchema.parse(await request.json());

    if (!parsed.warehouseId) {
      return NextResponse.json(
        { error: "warehouseId is required" },
        { status: 400 }
      );
    }

    const result = await runIdempotentOperation(
      "external-stock-in",
      idempotencyKey,
      async () => {
        const warehouseId = parsed.warehouseId;
        const [product, warehouse] = await Promise.all([
          prisma.product.findUnique({ where: { id: parsed.productId } }),
          prisma.warehouse.findUnique({ where: { id: warehouseId } }),
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

        const movement = resolveMovementQuantityAndWeight(
          product,
          parsed.quantity
        );

        const stockIn = await prisma.$transaction(async (tx) => {
          const createdLotBatch = `ENTRY-${Date.now()}`;
          const createdStockIn = await tx.stockIn.create({
            data: {
              productId: parsed.productId,
              userId: systemUser.id,
              quantity: movement.quantity,
              weight: movement.weight,
              warehouseId: warehouseId,
              lotBatch: createdLotBatch,
            },
          });

          await incrementWarehouseInventory(tx, {
            productId: parsed.productId,
            warehouseId: warehouseId,
            quantity: parsed.quantity,
            lotBatch: createdLotBatch,
            stockInId: createdStockIn.id,
          });

          await tx.activity.create({
            data: {
              userId: systemUser.id,
              action: "ورود کالا (API)",
              entity: "StockIn",
              entityId: createdStockIn.id,
              details: `${parsed.quantity} ${product.unit} از "${product.name}" از طریق API اضافه شد`,
            },
          });

          return createdStockIn;
        });

        return {
          status: 201,
          body: {
            success: true,
            message: "Stock in recorded successfully",
            stock_in: {
              id: stockIn.id,
              productId: stockIn.productId,
              quantity: Number(stockIn.quantity),
              createdAt: stockIn.createdAt,
            },
          },
        };
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
