import { WarehouseManager } from "@/components/warehouse-manager"
import { prisma } from "@/lib/prisma"

export default async function WarehousesPage() {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      _count: {
        select: { scales: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">انبارها</h2>
        <p className="text-muted-foreground">مدیریت انبارها و شعب</p>
      </div>
      <WarehouseManager warehouses={warehouses} />
    </div>
  )
}
