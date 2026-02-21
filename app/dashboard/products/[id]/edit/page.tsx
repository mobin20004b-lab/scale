import { prisma } from "@/lib/prisma"
import { ProductForm } from "@/components/product-form"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      barcodes: {
        where: { status: "ACTIVE" },
        select: { code: true },
      },
    },
  })

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="icon">
            <ArrowRight className="size-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ویرایش محصول</h2>
          <p className="text-muted-foreground">
            ویرایش اطلاعات {product.name}
          </p>
        </div>
      </div>

      <ProductForm product={product} />
    </div>
  )
}
