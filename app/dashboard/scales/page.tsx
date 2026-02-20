import { WarehouseScaleManager } from "@/components/warehouse-scale-manager"

export default function ScalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">انبارها و باسکول‌ها</h2>
        <p className="text-muted-foreground">مدیریت انبارها، باسکول‌ها و اتصال وبهوک وزن لحظه‌ای</p>
      </div>
      <WarehouseScaleManager />
    </div>
  )
}
