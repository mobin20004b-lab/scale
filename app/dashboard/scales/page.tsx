import { ScaleManager } from "@/components/scale-manager";
import { prisma } from "@/lib/prisma";

export default async function ScalesPage() {
  const [scales, warehouses] = await Promise.all([
    prisma.scale.findMany({
      include: {
        warehouse: {
          select: { id: true, name: true },
        },
        _count: {
          select: { stockIns: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ترازوها</h2>
        <p className="text-muted-foreground">مدیریت ترازوها و وزن زنده</p>
      </div>
      <ScaleManager scales={scales} warehouses={warehouses} />
    </div>
  );
}
