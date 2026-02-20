import { ProductForm } from "@/components/product-form"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NewProductPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="icon">
            <ArrowRight className="size-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">محصول جدید</h2>
          <p className="text-muted-foreground">
            اضافه کردن محصول جدید به انبار
          </p>
        </div>
      </div>

      <ProductForm />
    </div>
  )
}
