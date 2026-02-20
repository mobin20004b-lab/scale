import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { runIdempotentOperation } from "@/lib/idempotency";
import { externalStockInPayloadSchema } from "@/lib/schemas/inventory";

function checkAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  return !!apiKey;
}

export async function POST(request: Request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: "Unauthorized - API key required" }, { status: 401 });
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required" },
        { status: 400 },
      );
    }

    const parsed = externalStockInPayloadSchema.parse(await request.json());

    const result = await runIdempotentOperation(
      "external-stock-in",
      idempotencyKey,
      async () => {
        const product = await prisma.product.findUnique({
          where: { id: parsed.productId },
        });

        if (!product) {
          return { status: 404, body: { error: "Product not found" } };
        }

        const systemUser = await prisma.user.findFirst({
          where: { role: "ADMIN" },
        });

        if (!systemUser) {
          return { status: 500, body: { error: "System user not found" } };
        }

        const stockIn = await prisma.$transaction(async (tx) => {
          const createdStockIn = await tx.stockIn.create({
            data: {
              productId: parsed.productId,
              userId: systemUser.id,
              quantity: parsed.quantity,
              weight: parsed.quantity,
              supplier: parsed.supplier,
              invoiceNumber: parsed.invoiceNumber,
              notes: parsed.notes,
            },
          });

          await tx.product.update({
            where: { id: parsed.productId },
            data: {
              currentStock: {
                increment: parsed.quantity,
              },
            },
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
      },
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("[v0] External API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
