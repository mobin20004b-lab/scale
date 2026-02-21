import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revertWarehouseStockOut } from "@/lib/inventory-ledger";

const UNDO_WINDOW_MS = 5 * 60 * 1000;

const UNDO_BLOCKED_DEPENDENCY =
  "Undo blocked: subsequent warehouse transactions exist for this product.";

type UndoCheck =
  | {
      ok: true;
      stockOut: NonNullable<
        Awaited<ReturnType<typeof prisma.stockOut.findUnique>>
      >;
    }
  | { ok: false; status: number; error: string; reason: string };

async function getUndoEligibility(id: string): Promise<UndoCheck> {
  const stockOut = await prisma.stockOut.findUnique({
    where: { id },
    include: { product: true },
  });

  if (!stockOut) {
    return {
      ok: false,
      status: 404,
      error: "Stock-out not found",
      reason: "NOT_FOUND",
    };
  }

  if (!stockOut.warehouseId) {
    return {
      ok: false,
      status: 409,
      error: "Cannot undo legacy stock-out without warehouse context",
      reason: "WAREHOUSE_CONTEXT_REQUIRED",
    };
  }

  if (Date.now() - stockOut.createdAt.getTime() > UNDO_WINDOW_MS) {
    return {
      ok: false,
      status: 400,
      error: "Undo window has expired",
      reason: "UNDO_WINDOW_EXPIRED",
    };
  }

  const hasDependentTransactions = await prisma.inventoryLedgerEntry.findFirst({
    where: {
      productId: stockOut.productId,
      warehouseId: stockOut.warehouseId,
      createdAt: { gt: stockOut.createdAt },
    },
    select: { id: true },
  });

  if (hasDependentTransactions) {
    return {
      ok: false,
      status: 409,
      error: UNDO_BLOCKED_DEPENDENCY,
      reason: "DEPENDENT_TRANSACTIONS_EXIST",
    };
  }

  return { ok: true, stockOut };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getUndoEligibility(id);

  if (!result.ok) {
    return NextResponse.json(
      { eligible: false, error: result.error, reason: result.reason },
      { status: result.status }
    );
  }

  return NextResponse.json({
    eligible: true,
    reason: "OK",
    undoWindowMs: UNDO_WINDOW_MS,
    undoWindowEndsAt: new Date(
      result.stockOut.createdAt.getTime() + UNDO_WINDOW_MS
    ).toISOString(),
    audited: true,
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Supervisor permission required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const result = await getUndoEligibility(id);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, reason: result.reason },
        { status: result.status }
      );
    }

    await prisma.$transaction(async (tx) => {
      await revertWarehouseStockOut(tx, {
        productId: result.stockOut.productId,
        warehouseId: result.stockOut.warehouseId!,
        quantity: result.stockOut.quantity,
        stockOutId: result.stockOut.id,
        notes: "Undo stock-out",
      });

      await tx.stockOut.delete({ where: { id: result.stockOut.id } });

      await tx.activity.create({
        data: {
          userId: (session.user as any).id,
          action: "بازگشت خروج کالا",
          entity: "StockOut",
          entityId: result.stockOut.id,
          details: `${result.stockOut.quantity} ${result.stockOut.product.unit} از \"${result.stockOut.product.name}\" به موجودی بازگردانده شد`,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[v0] Error undoing stock out:", error);
    return NextResponse.json(
      { error: "Failed to undo stock out", reason: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
