import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const params = await searchParams

  return (
    <div className="max-w-xl mx-auto pt-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            عدم دسترسی به صفحه
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            شما مجوز لازم برای مشاهده این صفحه را ندارید. در صورت نیاز با مدیر سیستم تماس بگیرید.
          </p>
          {params.from ? (
            <p className="text-xs text-muted-foreground" dir="ltr">
              Requested path: {params.from}
            </p>
          ) : null}
          <Button asChild>
            <Link href="/dashboard">بازگشت به داشبورد</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
