import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UNDO_WINDOW_MS = 5 * 60 * 1000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const stockOut = await prisma.stockOut.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!stockOut) {
      return NextResponse.json({ error: "Stock-out not found" }, { status: 404 });
    }

    if (Date.now() - stockOut.createdAt.getTime() > UNDO_WINDOW_MS) {
      return NextResponse.json(
        { error: "Undo window has expired" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: stockOut.productId },
        data: {
          currentStock: {
            increment: stockOut.quantity,
          },
        },
      });

      await tx.stockOut.delete({ where: { id: stockOut.id } });

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "بازگشت خروج کالا",
          entity: "StockOut",
          entityId: stockOut.id,
          details: `${stockOut.quantity} ${stockOut.product.unit} از \"${stockOut.product.name}\" به موجودی بازگردانده شد`,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[v0] Error undoing stock out:", error);
    return NextResponse.json({ error: "Failed to undo stock out" }, { status: 500 });
  }
}
