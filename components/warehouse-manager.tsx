"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Edit, Plus, Trash2 } from "lucide-react"

interface Warehouse {
  id: string
  name: string
  location: string | null
  description: string | null
  _count?: { scales: number }
}

interface WarehouseManagerProps {
  warehouses: Warehouse[]
}

export function WarehouseManager({ warehouses }: WarehouseManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")

  const resetForm = () => {
    setName("")
    setLocation("")
    setDescription("")
    setEditing(null)
  }

  const submitWarehouse = async () => {
    try {
      const response = await fetch(editing ? `/api/warehouses/${editing.id}` : "/api/warehouses", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, description }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "خطا در ذخیره انبار")
      }

      toast.success(editing ? "انبار ویرایش شد" : "انبار ایجاد شد")
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "خطا در ذخیره انبار")
    }
  }

  const deleteWarehouse = async (id: string) => {
    try {
      const response = await fetch(`/api/warehouses/${id}`, { method: "DELETE" })
      if (!response.ok) {
        throw new Error("خطا در حذف انبار")
      }
      toast.success("انبار حذف شد")
      router.refresh()
    } catch {
      toast.error("خطا در حذف انبار")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>مدیریت انبارها</CardTitle>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value)
            if (!value) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 ml-2" />
              افزودن انبار
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "ویرایش انبار" : "افزودن انبار"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>نام انبار</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>موقعیت</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button onClick={submitWarehouse} className="w-full">
                ذخیره
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-medium">{warehouse.name}</div>
                {warehouse.location && <div className="text-sm text-muted-foreground">{warehouse.location}</div>}
                {warehouse.description && <div className="text-sm text-muted-foreground">{warehouse.description}</div>}
                <Badge variant="secondary">{warehouse._count?.scales ?? 0} ترازو</Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(warehouse)
                    setName(warehouse.name)
                    setLocation(warehouse.location || "")
                    setDescription(warehouse.description || "")
                    setOpen(true)
                  }}
                >
                  <Edit className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>حذف انبار</AlertDialogTitle>
                      <AlertDialogDescription>
                        آیا از حذف «{warehouse.name}» مطمئن هستید؟
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>انصراف</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteWarehouse(warehouse.id)}>حذف</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
