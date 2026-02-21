import { ScaleManager } from "@/components/scale-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScaleHealthSnapshot } from "@/lib/scale-health";
import { prisma } from "@/lib/prisma";

export default async function ScalesPage() {
  const [scales, warehouses] = await Promise.all([
    prisma.scale.findMany({
      where: { retiredAt: null },
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

  const fleetStatus = scales.reduce(
    (acc, scale) => {
      const health = getScaleHealthSnapshot(scale.lastWeightAt, {
        heartbeatIntervalSec: scale.heartbeatIntervalSec,
      }).health;
      acc[health] += 1;
      return acc;
    },
    { ONLINE: 0, STALE: 0, OFFLINE: 0 }
  );

  const firmwareMap = scales.reduce<Record<string, Record<string, number>>>(
    (acc, scale) => {
      const warehouse = scale.warehouse.name;
      const version = scale.firmwareVersion || "unknown";
      if (!acc[warehouse]) acc[warehouse] = {};
      acc[warehouse][version] = (acc[warehouse][version] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ترازوها</h2>
        <p className="text-muted-foreground">مدیریت ترازوها و وزن زنده</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Online</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fleetStatus.ONLINE}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stale</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fleetStatus.STALE}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Offline</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fleetStatus.OFFLINE}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Firmware Map by Warehouse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(firmwareMap).map(([warehouse, versions]) => (
            <div key={warehouse} className="space-y-1">
              <p className="text-sm font-medium">{warehouse}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(versions).map(([version, count]) => (
                  <Badge key={`${warehouse}-${version}`} variant="outline">
                    {version}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ScaleManager scales={scales} warehouses={warehouses} />
    </div>
  );
}
