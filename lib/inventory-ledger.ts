import { PrismaClient, Prisma } from "@prisma/client";

const DEFAULT_LOT = "";

export class InventoryConflictError extends Error {
  constructor(message = "Insufficient stock in selected warehouse") {
    super(message);
    this.name = "InventoryConflictError";
  }
}

type TxClient = Prisma.TransactionClient | PrismaClient;

export async function incrementWarehouseInventory(
  tx: TxClient,
  params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    lotBatch?: string | null;
    stockInId?: string;
    notes?: string | null;
  }
) {
  const lotBatch = params.lotBatch ?? DEFAULT_LOT;

  await tx.warehouseInventoryBalance.upsert({
    where: {
      productId_warehouseId_lotBatch: {
        productId: params.productId,
        warehouseId: params.warehouseId,
        lotBatch,
      },
    },
    create: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      lotBatch,
      quantity: params.quantity,
    },
    update: {
      quantity: { increment: params.quantity },
    },
  });

  await tx.inventoryLedgerEntry.create({
    data: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      lotBatch,
      quantityDelta: params.quantity,
      movementType: "STOCK_IN",
      stockInId: params.stockInId,
      notes: params.notes ?? null,
    },
  });

  await tx.product.update({
    where: { id: params.productId },
    data: { currentStock: { increment: params.quantity } },
  });
}

export async function decrementWarehouseInventory(
  tx: TxClient,
  params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    lotBatch?: string | null;
    stockOutId?: string;
    notes?: string | null;
  }
) {
  const lotBatch = params.lotBatch ?? DEFAULT_LOT;

  const updatedBalance = await tx.warehouseInventoryBalance.updateMany({
    where: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      lotBatch,
      quantity: { gte: params.quantity },
    },
    data: { quantity: { decrement: params.quantity } },
  });

  if (updatedBalance.count === 0) {
    throw new InventoryConflictError();
  }

  const updatedProduct = await tx.product.updateMany({
    where: {
      id: params.productId,
      currentStock: { gte: params.quantity },
    },
    data: {
      currentStock: { decrement: params.quantity },
    },
  });

  if (updatedProduct.count === 0) {
    throw new InventoryConflictError(
      "Insufficient product stock for requested quantity"
    );
  }

  await tx.inventoryLedgerEntry.create({
    data: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      lotBatch,
      quantityDelta: -params.quantity,
      movementType: "STOCK_OUT",
      stockOutId: params.stockOutId,
      notes: params.notes ?? null,
    },
  });
}

export async function revertWarehouseStockOut(
  tx: TxClient,
  params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    lotBatch?: string | null;
    stockOutId?: string;
    notes?: string | null;
  }
) {
  const lotBatch = params.lotBatch ?? DEFAULT_LOT;

  await tx.warehouseInventoryBalance.upsert({
    where: {
      productId_warehouseId_lotBatch: {
        productId: params.productId,
        warehouseId: params.warehouseId,
        lotBatch,
      },
    },
    create: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      lotBatch,
      quantity: params.quantity,
    },
    update: {
      quantity: { increment: params.quantity },
    },
  });

  await tx.product.update({
    where: { id: params.productId },
    data: { currentStock: { increment: params.quantity } },
  });

  await tx.inventoryLedgerEntry.create({
    data: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      lotBatch,
      quantityDelta: params.quantity,
      movementType: "STOCK_OUT_UNDO",
      stockOutId: params.stockOutId,
      notes: params.notes ?? null,
    },
  });
}
