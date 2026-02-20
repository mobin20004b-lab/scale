"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Trash2,
  AlertTriangle,
  PackageSearch,
  FilterX,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
}

interface ProductsTableProps {
  products: Product[];
  categories: string[];
  initialSearch: string;
  initialCategory: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function ProductsTable({
  products,
  categories,
  initialSearch,
  initialCategory,
}: ProductsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory || "all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const hasFilters = Boolean(search || (category && category !== "all"));

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category && category !== "all") params.set("category", category);
    router.push(`/dashboard/products?${params.toString()}`);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      applyFilters();
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  useEffect(() => {
    setCurrentPage(1);
  }, [products.length, pageSize]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const rangeStart =
    products.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, products.length);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("محصول با موفقیت حذف شد");
        router.refresh();
      } else {
        toast.error("خطا در حذف محصول");
      }
    } catch {
      toast.error("خطا در حذف محصول");
    }
  };

  const isLowStock = (product: Product) => {
    return Number(product.currentStock) <= Number(product.minStock);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[260px] flex gap-2">
          <Input
            placeholder="جستجو بر اساس نام، کد یا بارکد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            dir="rtl"
          />
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
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setCategory("all");
              router.push("/dashboard/products");
            }}
          >
            <FilterX className="size-4 ml-2" />
            پاک کردن فیلتر
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          نمایش {rangeStart}–{rangeEnd} از {products.length}
        </span>
        <div className="flex items-center gap-2">
          <span>تعداد در صفحه</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[65vh]">
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-20 bg-background">
                نام محصول
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                کد محصول
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                بارکد
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                دسته‌بندی
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                موجودی
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                واحد
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                موقعیت
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background text-center">
                عملیات
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <PackageSearch className="size-10 text-muted-foreground" />
                    <p className="font-medium">
                      {hasFilters
                        ? "نتیجه‌ای با این فیلترها پیدا نشد"
                        : "هنوز محصولی ثبت نشده است"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasFilters
                        ? "فیلترها را پاک کنید یا عبارت جستجو را تغییر دهید."
                        : "با افزودن اولین محصول، مدیریت موجودی را شروع کنید."}
                    </p>
                    {hasFilters ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearch("");
                          setCategory("all");
                          router.push("/dashboard/products");
                        }}
                      >
                        پاک کردن فیلترها
                      </Button>
                    ) : (
                      <Link href="/dashboard/products/new">
                        <Button>افزودن محصول</Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium sticky left-0 z-10 bg-background">
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
                    <Badge
                      variant={isLowStock(product) ? "destructive" : "default"}
                    >
                      {Number(product.currentStock).toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell>
                    {isLowStock(product) ? "کم‌موجودی" : "عادی"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/dashboard/products/${product.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`ویرایش ${product.name}`}
                        >
                          <Edit className="size-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`حذف ${product.name}`}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف محصول</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <span className="block">
                                این عمل غیرقابل بازگشت است.
                              </span>
                              <span className="block">
                                نام محصول: <strong>{product.name}</strong>
                              </span>
                              <span className="block">
                                کد محصول: <strong>{product.sku || "-"}</strong>
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id)}
                            >
                              حذف دائمی
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

        <div className="space-y-3 p-3 md:hidden">
          {products.length === 0 ? (
            <div className="rounded-lg border p-6">
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <PackageSearch className="size-10 text-muted-foreground" />
                <p className="font-medium">
                  {hasFilters
                    ? "نتیجه‌ای با این فیلترها پیدا نشد"
                    : "هنوز محصولی ثبت نشده است"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasFilters
                    ? "فیلترها را پاک کنید یا عبارت جستجو را تغییر دهید."
                    : "با افزودن اولین محصول، مدیریت موجودی را شروع کنید."}
                </p>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setCategory("all");
                      router.push("/dashboard/products");
                    }}
                  >
                    پاک کردن فیلترها
                  </Button>
                ) : (
                  <Link href="/dashboard/products/new">
                    <Button>افزودن محصول</Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            paginatedProducts.map((product) => (
              <div key={product.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold flex items-center gap-2">
                    {product.name}
                    {isLowStock(product) && (
                      <AlertTriangle className="size-4 text-orange-600" />
                    )}
                  </div>
                  <Badge
                    variant={isLowStock(product) ? "destructive" : "default"}
                  >
                    {Number(product.currentStock).toFixed(2)} {product.unit}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <span className="text-muted-foreground">کد محصول</span>
                  <span>{product.sku || "-"}</span>
                  <span className="text-muted-foreground">بارکد</span>
                  <span dir="ltr" className="text-right">
                    {product.barcode || "-"}
                  </span>
                  <span className="text-muted-foreground">دسته‌بندی</span>
                  <span>
                    {product.category ? (
                      <Badge variant="secondary">{product.category}</Badge>
                    ) : (
                      "-"
                    )}
                  </span>
                  <span className="text-muted-foreground">وضعیت</span>
                  <span>{isLowStock(product) ? "کم‌موجودی" : "عادی"}</span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1 border-t">
                  <Link href={`/dashboard/products/${product.id}/edit`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`ویرایش ${product.name}`}
                    >
                      <Edit className="size-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`حذف ${product.name}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف محصول</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <span className="block">
                            این عمل غیرقابل بازگشت است.
                          </span>
                          <span className="block">
                            نام محصول: <strong>{product.name}</strong>
                          </span>
                          <span className="block">
                            کد محصول: <strong>{product.sku || "-"}</strong>
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product.id)}
                        >
                          حذف دائمی
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {products.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            قبلی
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحه {currentPage} از {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            بعدی
          </Button>
        </div>
      )}
    </div>
  );
}
