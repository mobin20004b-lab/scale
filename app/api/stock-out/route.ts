import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { validationErrorResponse } from "@/lib/api-validation";
import { stockOutPayloadSchema } from "@/lib/schemas/inventory";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = stockOutPayloadSchema.parse(await request.json());

    const product = await prisma.product.findUnique({
      where: { id: parsed.productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (Number(product.currentStock) < parsed.quantity) {
      return NextResponse.json({ error: "Insufficient quantity available" }, { status: 400 });
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
        },
      });

      await tx.product.update({
        where: { id: parsed.productId },
        data: {
          currentStock: {
            decrement: parsed.quantity,
          },
        },
      });

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "خروج کالا",
          entity: "StockOut",
          entityId: createdStockOut.id,
          details: `${parsed.quantity} ${product.unit} از "${product.name}" از انبار خارج شد`,
        },
      });

      return createdStockOut;
    });

    return NextResponse.json(stockOut, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("[v0] Error creating stock out:", error);
    return NextResponse.json({ error: "Failed to create stock out" }, { status: 500 });
  }
}
