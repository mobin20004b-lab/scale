"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("failed")
  }
  return res.json()
}

export function WarehouseScaleManager() {
  const [warehouseForm, setWarehouseForm] = useState({ name: "", code: "", location: "" })
  const [scaleForm, setScaleForm] = useState({ name: "", serialNumber: "", warehouseId: "", unit: "kg" })

  const { data: warehouses, mutate: mutateWarehouses } = useSWR("/api/warehouses", fetcher)
  const { data: scales, mutate: mutateScales } = useSWR("/api/scales", fetcher, { refreshInterval: 1000 })

  const createWarehouse = async () => {
    const res = await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(warehouseForm),
    })

    if (res.ok) {
      toast.success("انبار جدید ایجاد شد")
      setWarehouseForm({ name: "", code: "", location: "" })
      mutateWarehouses()
    } else {
      toast.error("ایجاد انبار ناموفق بود")
    }
  }

  const createScale = async () => {
    const res = await fetch("/api/scales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scaleForm),
    })

    if (res.ok) {
      toast.success("باسکول جدید ایجاد شد")
      setScaleForm({ name: "", serialNumber: "", warehouseId: "", unit: "kg" })
      mutateScales()
    } else {
      toast.error("ایجاد باسکول ناموفق بود")
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ایجاد انبار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>نام انبار</Label>
              <Input value={warehouseForm.name} onChange={(e) => setWarehouseForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>کد انبار</Label>
              <Input value={warehouseForm.code} onChange={(e) => setWarehouseForm((p) => ({ ...p, code: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>موقعیت</Label>
              <Input value={warehouseForm.location} onChange={(e) => setWarehouseForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <Button onClick={createWarehouse} className="w-full">ثبت انبار</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ایجاد باسکول</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>نام باسکول</Label>
              <Input value={scaleForm.name} onChange={(e) => setScaleForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>شماره سریال</Label>
              <Input value={scaleForm.serialNumber} onChange={(e) => setScaleForm((p) => ({ ...p, serialNumber: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>شناسه انبار</Label>
              <Input value={scaleForm.warehouseId} onChange={(e) => setScaleForm((p) => ({ ...p, warehouseId: e.target.value }))} dir="ltr" placeholder="از جدول انبار کپی کنید" />
            </div>
            <Button onClick={createScale} className="w-full">ثبت باسکول</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست انبارها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(warehouses || []).map((warehouse: any) => (
            <div key={warehouse.id} className="rounded border p-3 text-sm">
              <div className="font-medium">{warehouse.name} ({warehouse.code})</div>
              <div className="text-muted-foreground" dir="ltr">ID: {warehouse.id}</div>
              <div className="text-muted-foreground">تعداد باسکول: {warehouse._count?.scales || 0}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>لیست باسکول‌ها و وضعیت لحظه‌ای</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(scales || []).map((scale: any) => {
            const isOnline = !!scale.lastSeenAt && Date.now() - new Date(scale.lastSeenAt).getTime() < 5000
            return (
              <div key={scale.id} className="rounded border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{scale.name} - {scale.serialNumber}</div>
                  <Badge variant={isOnline ? "default" : "secondary"}>{isOnline ? "آنلاین" : "آفلاین"}</Badge>
                </div>
                <div>انبار: {scale.warehouse?.name}</div>
                <div dir="ltr">Webhook Token: {scale.webhookToken}</div>
                <div dir="ltr">Weight: {scale.lastWeight ?? "---"} {scale.unit}</div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
