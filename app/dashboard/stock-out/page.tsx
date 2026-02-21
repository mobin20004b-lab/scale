import { StockOutForm } from "@/components/stock-out-form";
import { StockOutList } from "@/components/stock-out-list";
import { prisma } from "@/lib/prisma";

export default async function StockOutPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const params = await searchParams;

  const [products, recentStockOuts, warehouses] = await Promise.all([
    prisma.product.findMany({
      where: {
        currentStock: {
          gt: 0,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.stockOut.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
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
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">خروج کالا</h2>
        <p className="text-muted-foreground">ثبت خروج کالا از انبار</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StockOutForm products={products} warehouses={warehouses} />
        <StockOutList
          stockOuts={recentStockOuts}
          highlightId={params.highlight}
        />
      </div>
    </div>
  );
}
