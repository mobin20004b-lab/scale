"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react"

interface Warehouse {
  id: string
  name: string
}

interface Scale {
  id: string
  name: string
  apiKey: string
  warehouseId: string
  warehouse: Warehouse
  lastWeight: number | null
  lastWeightAt: string | Date | null
  isActive: boolean
}

interface ScaleManagerProps {
  scales: Scale[]
  warehouses: Warehouse[]
}

export function ScaleManager({ scales, warehouses }: ScaleManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Scale | null>(null)
  const [name, setName] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [liveWeights, setLiveWeights] = useState<Record<string, { lastWeight: number | null; lastWeightAt: string | Date | null }>>({})

  const activeScales = useMemo(() => scales.filter((scale) => scale.isActive), [scales])

  useEffect(() => {
    if (activeScales.length === 0) return

    const fetchWeights = async () => {
      for (const scale of activeScales) {
        const response = await fetch(`/api/scales/${scale.id}/weight`)
        if (response.ok) {
          const payload = await response.json()
          setLiveWeights((previous) => ({
            ...previous,
            [scale.id]: {
              lastWeight: payload.lastWeight,
              lastWeightAt: payload.lastWeightAt,
            },
          }))
        }
      }
    }

    fetchWeights()
    const interval = setInterval(fetchWeights, 1000)
    return () => clearInterval(interval)
  }, [activeScales])

  const submitScale = async () => {
    try {
      const response = await fetch(editing ? `/api/scales/${editing.id}` : "/api/scales", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, warehouseId }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "خطا در ذخیره ترازو")
      }

      toast.success(editing ? "ترازو ویرایش شد" : "ترازو ایجاد شد")
      setOpen(false)
      setEditing(null)
      setName("")
      setWarehouseId("")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "خطا در ذخیره ترازو")
    }
  }

  const deleteScale = async (id: string) => {
    const response = await fetch(`/api/scales/${id}`, { method: "DELETE" })
    if (response.ok) {
      toast.success("ترازو حذف شد")
      router.refresh()
    } else {
      toast.error("خطا در حذف ترازو")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>مدیریت ترازوها</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 ml-2" />
              افزودن ترازو
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "ویرایش ترازو" : "افزودن ترازو"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>نام ترازو</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>انبار</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب انبار" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={submitScale} className="w-full">ذخیره</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {scales.map((scale) => {
          const live = liveWeights[scale.id]
          const lastWeight = live?.lastWeight ?? scale.lastWeight
          const lastWeightAt = live?.lastWeightAt ?? scale.lastWeightAt

          return (
            <div key={scale.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{scale.name}</div>
                  <div className="text-sm text-muted-foreground">انبار: {scale.warehouse.name}</div>
                  <div className="text-xs text-muted-foreground">کلید API: ••••••••{scale.apiKey.slice(-6)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(scale)
                      setName(scale.name)
                      setWarehouseId(scale.warehouseId)
                      setOpen(true)
                    }}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(scale.apiKey)}>
                    <RefreshCw className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteScale(scale.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge>{lastWeight !== null ? `${Number(lastWeight).toFixed(2)} گرم` : "بدون وزن"}</Badge>
                <span className="text-muted-foreground">
                  {lastWeightAt ? `آخرین دریافت: ${new Date(lastWeightAt).toLocaleTimeString("fa-IR")}` : "داده‌ای دریافت نشده"}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
