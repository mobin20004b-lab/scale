"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Edit, Trash2, Search, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
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

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category: string | null
  unit: string
  currentStock: number
  minStock: number
}

interface ProductsTableProps {
  products: Product[]
  categories: string[]
  initialSearch: string
  initialCategory: string
}

export function ProductsTable({ 
  products, 
  categories,
  initialSearch,
  initialCategory
}: ProductsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [category, setCategory] = useState(initialCategory || "all")

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category && category !== 'all') params.set('category', category)
    router.push(`/dashboard/products?${params.toString()}`)
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success("محصول با موفقیت حذف شد")
        router.refresh()
      } else {
        toast.error("خطا در حذف محصول")
      }
    } catch (error) {
      toast.error("خطا در حذف محصول")
    }
  }

  const isLowStock = (product: Product) => {
    return Number(product.currentStock) <= Number(product.minStock)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="جستجو بر اساس نام، کد یا بارکد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            dir="rtl"
          />
          <Button onClick={handleSearch} variant="secondary">
            <Search className="size-4" />
          </Button>
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="دسته‌بندی" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || (category && category !== 'all')) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("")
              setCategory("all")
              router.push('/dashboard/products')
            }}
          >
            پاک کردن فیلتر
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام محصول</TableHead>
              <TableHead>کد محصول</TableHead>
              <TableHead>بارکد</TableHead>
              <TableHead>دسته‌بندی</TableHead>
              <TableHead>موجودی</TableHead>
              <TableHead>واحد</TableHead>
              <TableHead>موقعیت</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  محصولی یافت نشد
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {product.name}
                      {isLowStock(product) && (
                        <AlertTriangle className="size-4 text-orange-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.sku || "-"}</TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {product.barcode || "-"}
                  </TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="secondary">{product.category}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isLowStock(product) ? "destructive" : "default"}>
                      {Number(product.currentStock).toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/dashboard/products/${product.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="size-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف محصول</AlertDialogTitle>
                            <AlertDialogDescription>
                              آیا از حذف این محصول اطمینان دارید؟ این عمل قابل بازگشت نیست.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)}>
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
