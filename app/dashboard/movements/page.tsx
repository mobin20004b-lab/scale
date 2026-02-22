import { NewMovementForm } from "@/components/new-movement-form";
import { prisma } from "@/lib/prisma";

interface BalanceRow {
  productId: string;
  warehouseId: string;
  quantity: number;
}

export default async function MovementsPage() {
  const [products, warehouses, balances, scales] = await Promise.all([
    prisma.product.findMany({
      include: {
        barcodes: {
          where: { status: "ACTIVE" },
          select: { code: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRaw<BalanceRow[]>`
      SELECT "productId", "warehouseId", "quantity"
      FROM "warehouse_inventory_balances"
    `,
    prisma.scale.findMany({
      where: { isActive: true, retiredAt: null },
      select: { id: true, name: true, warehouseId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const inventoryByWarehouse = balances.reduce<Record<string, number>>(
    (acc, row) => {
      acc[`${row.productId}:${row.warehouseId}`] = Number(row.quantity);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">حرکت جدید</h2>
        <p className="text-muted-foreground">
          جریان سریع و یکپارچه برای ورود و خروج کالا
        </p>
      </div>
      <NewMovementForm
        products={products}
        warehouses={warehouses}
        scales={scales}
        inventoryByWarehouse={inventoryByWarehouse}
      />
    </div>
  );
}
