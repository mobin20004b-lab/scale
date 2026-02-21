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
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  Edit,
  Trash2,
  AlertTriangle,
  PackageSearch,
  FilterX,
  Archive,
  Download,
  SlidersHorizontal,
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

type SortKey = "stock" | "minStock" | "category" | "latestMovement";
type SortDir = "asc" | "desc";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  stockIns?: { createdAt: string | Date }[];
  stockOuts?: { createdAt: string | Date }[];
  _count?: {
    stockIns: number;
    stockOuts: number;
    warehouseBalances: number;
  };
  deleteRequestedAt?: string | Date | null;
  deleteCommitAfter?: string | Date | null;
  deleteConflictAt?: string | Date | null;
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
  const [localProducts, setLocalProducts] = useState(products);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "latestMovement",
    dir: "desc",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

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

  const visibleProducts = useMemo(
    () => localProducts.filter((product) => !hiddenIds.includes(product.id)),
    [localProducts, hiddenIds]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [visibleProducts.length, pageSize]);

  const getLatestMovementMs = (product: Product) => {
    const latestIn = product.stockIns?.[0]?.createdAt
      ? new Date(product.stockIns[0].createdAt).getTime()
      : 0;
    const latestOut = product.stockOuts?.[0]?.createdAt
      ? new Date(product.stockOuts[0].createdAt).getTime()
      : 0;
    return Math.max(latestIn, latestOut);
  };

  const sortedProducts = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...visibleProducts].sort((a, b) => {
      if (sort.key === "stock") {
        return (Number(a.currentStock) - Number(b.currentStock)) * factor;
      }
      if (sort.key === "minStock") {
        return (Number(a.minStock) - Number(b.minStock)) * factor;
      }
      if (sort.key === "category") {
        return (a.category || "").localeCompare(b.category || "fa") * factor;
      }
      return (getLatestMovementMs(a) - getLatestMovementMs(b)) * factor;
    });
  }, [visibleProducts, sort]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const rangeStart = sortedProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, sortedProducts.length);

  const selectedProducts = sortedProducts.filter((product) => selectedIds.includes(product.id));
  const allVisibleSelected = paginatedProducts.length > 0 && paginatedProducts.every((product) => selectedIds.includes(product.id));

  const toggleSort = (key: SortKey) => {
    setSort((previous) => {
      if (previous.key === key) {
        return { key, dir: previous.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "desc" };
    });
  };

  const exportSelection = () => {
    const rows = (selectedProducts.length > 0 ? selectedProducts : sortedProducts).map((product) => {
      const latestMovement = getLatestMovementMs(product)
        ? new Date(getLatestMovementMs(product)).toLocaleString("fa-IR")
        : "-";
      return [
        product.name,
        product.sku || "",
        product.barcode || "",
        product.category || "",
        String(product.currentStock),
        String(product.minStock),
        product.unit,
        latestMovement,
      ];
    });

    const csv = [
      ["name", "sku", "barcode", "category", "stock", "min_stock", "unit", "latest_movement"],
      ...rows,
    ]
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("خروجی CSV ایجاد شد.");
  };

  const adjustMinStockBatch = async () => {
    if (selectedIds.length === 0) {
      toast.error("ابتدا چند محصول را انتخاب کنید.");
      return;
    }

    const value = window.prompt("حداقل موجودی جدید برای اقلام انتخاب‌شده را وارد کنید", "0");
    if (value === null) return;

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("مقدار واردشده معتبر نیست.");
      return;
    }

    const response = await fetch("/api/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjustMinStock", productIds: selectedIds, minStock: parsed }),
    });

    if (!response.ok) {
      toast.error("به‌روزرسانی گروهی ناموفق بود.");
      return;
    }

    setLocalProducts((previous) =>
      previous.map((item) => (selectedIds.includes(item.id) ? { ...item, minStock: parsed } : item))
    );
    toast.success("حداقل موجودی محصولات انتخابی تغییر کرد.");
  };

  const archiveSelection = () => {
    if (selectedIds.length === 0) {
      toast.error("ابتدا چند محصول را انتخاب کنید.");
      return;
    }

    setHiddenIds((previous) => Array.from(new Set([...previous, ...selectedIds])));
    setSelectedIds([]);
    toast.success("اقلام انتخابی از لیست فعلی مخفی شدند.");
  };

  const handleDelete = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(payload?.error || "خطا در شروع حذف محصول");
        return;
      }

      setLocalProducts((previous) =>
        previous.map((item) =>
          item.id === product.id
            ? {
                ...item,
                deleteRequestedAt: payload.deleteRequestedAt ?? new Date().toISOString(),
                deleteCommitAfter: payload.deleteCommitAfter ?? null,
                deleteConflictAt: payload.deleteConflictAt ?? null,
              }
            : item
        )
      );

      toast.success("حذف محصول در سرور زمان‌بندی شد. تا قبل از نهایی‌سازی قابل بازیابی است.");
      router.refresh();
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    }
  };

  const recoverDelete = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}/recover`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(payload?.error || "بازیابی حذف ناموفق بود");
        router.refresh();
        return;
      }

      setLocalProducts((previous) =>
        previous.map((item) =>
          item.id === product.id
            ? {
                ...item,
                deleteRequestedAt: null,
                deleteCommitAfter: null,
                deleteConflictAt: null,
              }
            : item
        )
      );
      toast.success("حذف محصول از حالت انتظار خارج شد.");
      router.refresh();
    } catch {
      toast.error("خطا در بازیابی حذف محصول");
    }
  };

  const isPendingDelete = (product: Product) => Boolean(product.deleteRequestedAt && product.deleteCommitAfter);

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

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          نمایش {rangeStart}–{rangeEnd} از {sortedProducts.length}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportSelection}>
            <Download className="size-4 ml-1" />
            خروجی
          </Button>
          <Button size="sm" variant="outline" onClick={adjustMinStockBatch}>
            <SlidersHorizontal className="size-4 ml-1" />
            تنظیم حداقل موجودی
          </Button>
          <Button size="sm" variant="outline" onClick={archiveSelection}>
            <Archive className="size-4 ml-1" />
            آرشیو/مخفی
          </Button>
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
              <TableHead className="sticky top-0 z-20 bg-background w-[44px]">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds((previous) =>
                        Array.from(new Set([...previous, ...paginatedProducts.map((product) => product.id)]))
                      );
                    } else {
                      setSelectedIds((previous) =>
                        previous.filter((id) => !paginatedProducts.some((product) => product.id === id))
                      );
                    }
                  }}
                  aria-label="انتخاب همه"
                />
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">نام محصول</TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">کد محصول</TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">بارکد</TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("category")}>
                  دسته‌بندی
                  <ArrowUpDown className="size-3 mr-1" />
                </Button>
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("stock")}>
                  موجودی
                  <ArrowUpDown className="size-3 mr-1" />
                </Button>
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">واحد</TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("minStock")}>
                  حداقل موجودی
                  <ArrowUpDown className="size-3 mr-1" />
                </Button>
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("latestMovement")}>
                  آخرین گردش
                  <ArrowUpDown className="size-3 mr-1" />
                </Button>
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background text-center sticky right-0">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12">
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
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product) => {
                const relatedRecords =
                  (product._count?.stockIns ?? 0) +
                  (product._count?.stockOuts ?? 0) +
                  (product._count?.warehouseBalances ?? 0);

                const latestMovementMs = getLatestMovementMs(product);

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onCheckedChange={(checked) => {
                          setSelectedIds((previous) =>
                            checked
                              ? Array.from(new Set([...previous, product.id]))
                              : previous.filter((id) => id !== product.id)
                          );
                        }}
                        aria-label={`انتخاب ${product.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {product.name}
                        {isPendingDelete(product) && <Badge variant="outline">در انتظار حذف</Badge>}
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
                        variant={
                          isLowStock(product) ? "destructive" : "default"
                        }
                      >
                        {Number(product.currentStock).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>{Number(product.minStock).toFixed(2)}</TableCell>
                    <TableCell>{latestMovementMs ? new Date(latestMovementMs).toLocaleString("fa-IR") : "-"}</TableCell>
                    <TableCell className="sticky right-0 bg-background">
                      <div className="flex items-center justify-center gap-2 border-r pr-2">
                        <Link href={`/dashboard/products/${product.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label={`ویرایش ${product.name}`}
                          >
                            <Edit className="size-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-11 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`حذف ${product.name}`}
                              disabled={isPendingDelete(product)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent closeBehavior="destructive">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف محصول</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <span className="block">این عمل غیرقابل بازگشت است.</span>
                                <span className="block">نام محصول: <strong>{product.name}</strong></span>
                                <span className="block">کد محصول: <strong>{product.sku || "-"}</strong></span>
                                <span className="block font-medium text-amber-600 dark:text-amber-400">
                                  وابستگی‌ها: {product._count?.stockIns ?? 0} ورودی، {product._count?.stockOuts ?? 0} خروج، {product._count?.warehouseBalances ?? 0} موجودی انبار
                                </span>
                                {relatedRecords > 0 && (
                                  <span className="block text-muted-foreground">
                                    پیشنهاد ایمن‌تر: به‌جای حذف دائمی، از گزینه «آرشیو/مخفی» در بالای جدول استفاده کنید.
                                  </span>
                                )}
                                <div className="space-y-1">
                                  <span className="block">برای حذف دائمی، نام محصول را تایپ کنید:</span>
                                  <Input
                                    value={deleteConfirm[product.id] || ""}
                                    onChange={(event) =>
                                      setDeleteConfirm((previous) => ({ ...previous, [product.id]: event.target.value }))
                                    }
                                    placeholder={product.name}
                                  />
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>انصراف</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={(event) => {
                                  if ((deleteConfirm[product.id] || "").trim() !== product.name) {
                                    event.preventDefault();
                                    toast.error("برای حذف دائمی باید نام محصول دقیقاً وارد شود.");
                                    return;
                                  }
                                  void handleDelete(product);
                                }}
                                disabled={isPendingDelete(product)}
                              >
                                {isPendingDelete(product) ? "حذف زمان‌بندی شده" : "حذف دائمی"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {isPendingDelete(product) && (
                          <Button variant="secondary" size="sm" onClick={() => recoverDelete(product)}>
                            بازیابی حذف
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {sortedProducts.length > 0 && (
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

export function ProductsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1 min-w-[260px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-3 p-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
