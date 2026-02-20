"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const productSchema = z.object({
  name: z.string().min(1, "نام محصول الزامی است"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1, "واحد اندازه‌گیری الزامی است"),
  minStock: z.string().min(0, "حداقل موجودی باید مثبت باشد"),
  weightPerUnit: z.string().min(0, "وزن هر واحد باید مثبت باشد"),
  description: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: any
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      category: product.category || "",
      unit: product.unit,
      minStock: product.minStock.toString(),
      weightPerUnit: product.weightPerUnit?.toString() || "",
      description: product.description || "",
    } : {
      unit: "کیلوگرم",
      weightPerUnit: ""
    }
  })

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true)

    try {
      const url = product
        ? `/api/products/${product.id}`
        : '/api/products'

      const method = product ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          minStock: parseFloat(data.minStock),
          weightPerUnit: parseFloat(data.weightPerUnit)
        })
      })

      if (response.ok) {
        toast.success(product ? "محصول با موفقیت ویرایش شد" : "محصول با موفقیت اضافه شد")
        router.push('/dashboard/products')
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || "خطا در ذخیره محصول")
      }
    } catch (error) {
      toast.error("خطا در ذخیره محصول")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>اطلاعات محصول</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-busy={isLoading}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">نام محصول *</Label>
              <Input
                id="name"
                {...register("name")}
                disabled={isLoading}
                dir="rtl"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">کد محصول (SKU)</Label>
              <Input
                id="sku"
                {...register("sku")}
                disabled={isLoading}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">بارکد</Label>
              <Input
                id="barcode"
                {...register("barcode")}
                disabled={isLoading}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">دسته‌بندی</Label>
              <Input
                id="category"
                {...register("category")}
                disabled={isLoading}
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">واحد اندازه‌گیری *</Label>
              <Input
                id="unit"
                {...register("unit")}
                disabled={isLoading}
                dir="rtl"
                placeholder="کیلوگرم، گرم، لیتر، ..."
              />
              {errors.unit && (
                <p className="text-sm text-destructive">{errors.unit.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">حداقل موجودی (آستانه هشدار) *</Label>
              <Input
                id="minStock"
                type="number"
                step="0.01"
                {...register("minStock")}
                disabled={isLoading}
                dir="ltr"
              />
              {errors.minStock && (
                <p className="text-sm text-destructive">{errors.minStock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightPerUnit">وزن هر واحد (گرم) *</Label>
              <Input
                id="weightPerUnit"
                type="number"
                step="0.01"
                {...register("weightPerUnit")}
                disabled={isLoading}
                dir="ltr"
              />
              {errors.weightPerUnit && (
                <p className="text-sm text-destructive">{errors.weightPerUnit.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">توضیحات</Label>
            <textarea
              id="description"
              {...register("description")}
              disabled={isLoading}
              dir="rtl"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="توضیحات تکمیلی درباره محصول..."
            ></textarea>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading} aria-busy={isLoading}>
              {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
              {product ? "ذخیره تغییرات" : "ثبت محصول"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/products')}
              disabled={isLoading}
            >
              انصراف
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
