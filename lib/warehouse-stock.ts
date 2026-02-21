import { PrismaClient, Prisma } from "@prisma/client";

export type TxLike = Prisma.TransactionClient | PrismaClient;

export async function getWarehouseAvailableQuantity(
  tx: TxLike,
  params: { productId: string; warehouseId: string }
) {
  const rows = await tx.warehouseInventoryBalance.findMany({
    where: {
      productId: params.productId,
      warehouseId: params.warehouseId,
    },
    select: { quantity: true },
  });

  return rows.reduce((sum, row) => sum + Number(row.quantity), 0);
}
