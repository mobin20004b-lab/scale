import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { stockInPayloadSchema } from "@/lib/schemas/inventory";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = stockInPayloadSchema.parse(await request.json());

    const product = await prisma.product.findUnique({
      where: { id: parsed.productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const stockIn = await prisma.$transaction(async (tx) => {
      const createdStockIn = await tx.stockIn.create({
        data: {
          productId: parsed.productId,
          userId: (session.user as any).id,
          quantity: parsed.quantity,
          weight: parsed.quantity,
          supplier: parsed.supplier,
          invoiceNumber: parsed.invoiceNumber,
          sourceDocumentType: parsed.sourceDocumentType,
          sourceDocumentNumber: parsed.sourceDocumentNumber,
          lotBatch: parsed.lotBatch,
          expiryDate: parsed.expiryDate,
          supplierLot: parsed.supplierLot,
          qualityResult: parsed.qualityResult,
          notes: parsed.notes,
          warehouseId: parsed.warehouseId || null,
          scaleId: parsed.scaleId || null,
          scaleWeight: parsed.scaleWeight,
          capturedAt: parsed.capturedAt ? new Date(parsed.capturedAt) : null,
          stableWindowMs: parsed.stableWindowMs ?? null,
          sourceScaleId: parsed.sourceScaleId ?? null,
          confidence: parsed.confidence ?? null,
          captureSource: parsed.captureSource ?? null,
          manualEntryReason: parsed.manualEntryReason ?? null,
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
          userId: (session.user as any).id,
          action: "ورود کالا",
          entity: "StockIn",
          entityId: createdStockIn.id,
          details: `${parsed.quantity} ${product.unit} از "${product.name}" به انبار اضافه شد`,
        },
      });

      return createdStockIn;
    });

    return NextResponse.json(stockIn, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("[v0] Error creating stock in:", error);
    return NextResponse.json({ error: "Failed to create stock in" }, { status: 500 });
  }
}
