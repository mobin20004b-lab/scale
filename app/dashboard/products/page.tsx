import { prisma } from "@/lib/prisma"
import { ProductsTable } from "@/components/products-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const params = await searchParams
  const search = params.search || ""
  const category = params.category || ""

  const whereClause: any = {}
  
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } }
    ]
  }

  if (category) {
    whereClause.category = category
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.product.findMany({
      select: {
        category: true
      },
      distinct: ['category']
    })
  ])

  const uniqueCategories = categories
    .map(c => c.category)
    .filter((c): c is string => c !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">مدیریت محصولات</h2>
          <p className="text-muted-foreground">
            مشاهده و مدیریت محصولات انبار
          </p>
        </div>
        <Link href="/dashboard/products/new">
          <Button>
            <Plus className="ml-2 size-4" />
            محصول جدید
          </Button>
        </Link>
      </div>

      <ProductsTable 
        products={products} 
        categories={uniqueCategories}
        initialSearch={search}
        initialCategory={category}
      />
    </div>
  )
}
