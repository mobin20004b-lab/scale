import { StockInForm } from "@/components/stock-in-form";
import { StockInList } from "@/components/stock-in-list";
import { prisma } from "@/lib/prisma";

export default async function StockInPage() {
  const [products, recentStockIns, warehouses, scales] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.stockIn.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        warehouse: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            full_name: true,
          },
        },
      },
    }),
    prisma.warehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.scale.findMany({
      select: {
        id: true,
        name: true,
        warehouseId: true,
        tare: true,
        unit: true,
        precision: true,
      },
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ورود کالا</h2>
        <p className="text-muted-foreground">ثبت ورود کالا به انبار</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StockInForm
          products={products}
          warehouses={warehouses}
          scales={scales}
        />
        <StockInList stockIns={recentStockIns} />
      </div>
    </div>
  );
}
