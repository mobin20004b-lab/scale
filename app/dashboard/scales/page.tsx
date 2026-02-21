import { ScaleManager } from "@/components/scale-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScaleHealthSnapshot } from "@/lib/scale-health";
import { prisma } from "@/lib/prisma";
import { finalizeDueDeletes } from "@/lib/deletion-lifecycle";
import { getDictionary, getSessionLocale } from "@/lib/i18n";

export default async function ScalesPage() {
  await finalizeDueDeletes("scale");

  const locale = await getSessionLocale();
  const t = getDictionary(locale);

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
      const version = scale.firmwareVersion || t.common.unknown;
      if (!acc[warehouse]) acc[warehouse] = {};
      acc[warehouse][version] = (acc[warehouse][version] || 0) + 1;
      return acc;
    },
    {}
  );

  const scalesForUi = scales.map(({ apiKey, ...scale }) => ({
    ...scale,
    apiKeyLast4: apiKey.slice(-4),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ترازوها</h2>
        <p className="text-muted-foreground">مدیریت ترازوها و وزن زنده</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.scales.online}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fleetStatus.ONLINE}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.scales.stale}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fleetStatus.STALE}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.scales.offline}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fleetStatus.OFFLINE}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.scales.fleetFirmwareMap}</CardTitle>
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

      <ScaleManager scales={scalesForUi} warehouses={warehouses} />
    </div>
  );
}
