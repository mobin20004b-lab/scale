import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Code,
  Database,
  Key,
  Lock,
  Settings,
  Shield,
  UserCog,
  Users
} from "lucide-react"

const settingsSections = [
  {
    title: "مدیریت کاربران",
    description: "تعریف نقش‌ها، فعال/غیرفعال کردن کاربران و مدیریت دسترسی‌ها",
    icon: Users,
    items: ["ایجاد و حذف کاربر", "تخصیص نقش‌ها", "ثبت لاگ ورود کاربران"]
  },
  {
    title: "مدیریت API",
    description: "ایجاد و چرخش توکن‌ها، محدودیت نرخ و سطح دسترسی سرویس‌ها",
    icon: UserCog,
    items: ["صدور توکن جدید", "تنظیم Rate Limit", "تعریف دسترسی Endpoint"]
  },
  {
    title: "تغییر رمز عبور",
    description: "به‌روزرسانی رمز عبور حساب و اعمال سیاست‌های امنیتی",
    icon: Lock,
    items: ["حداقل پیچیدگی رمز", "الزام تغییر دوره‌ای", "خروج از تمام نشست‌ها"]
  },
  {
    title: "تنظیمات عمومی سیستم",
    description: "پیکربندی اعلان‌ها، زبان، منطقه زمانی و تنظیمات پایه",
    icon: Settings,
    items: ["تنظیم اعلان‌ها", "مدیریت زبان", "پیکربندی منطقه زمانی"]
  }
]

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">تنظیمات سیستم</h2>
        <p className="text-muted-foreground">
          مدیریت کاربران، امنیت، API و مستندات یکپارچه‌سازی در یک بخش
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon

          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-2 size-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="size-5" />
            مستندات API
          </CardTitle>
          <CardDescription>
            برای جلوگیری از شلوغی بخش تنظیمات، جزئیات یکپارچه‌سازی API در این قسمت مستند شده است
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            احراز هویت API
          </CardTitle>
          <CardDescription>
            برای استفاده از API، باید اطلاعات احراز هویت خود را ارسال کنید
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm font-mono" dir="ltr">
              Authorization: Bearer YOUR_API_TOKEN
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            برای دریافت توکن API، با مدیر سیستم تماس بگیرید.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="size-5" />
            نقاط پایانی API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="default">GET</Badge>
              <code className="text-sm" dir="ltr">/api/external/products</code>
            </div>
            <p className="text-sm text-muted-foreground">
              دریافت لیست تمام محصولات با موجودی فعلی
            </p>
            <div className="p-3 rounded-lg bg-muted">
              <pre className="text-xs font-mono overflow-x-auto" dir="ltr">{`{
  "products": [
    {
      "id": 1,
      "name": "محصول نمونه",
      "sku": "SKU-001",
      "barcode": "1234567890",
      "current_quantity": 150.50,
      "unit": "کیلوگرم",
      "category": "مواد اولیه"
    }
  ]
}`}</pre>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Badge variant="default">GET</Badge>
              <code className="text-sm" dir="ltr">/api/external/product/:id</code>
            </div>
            <p className="text-sm text-muted-foreground">
              دریافت اطلاعات کامل یک محصول خاص
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">POST</Badge>
              <code className="text-sm" dir="ltr">/api/external/stock-in</code>
            </div>
            <p className="text-sm text-muted-foreground">
              ثبت ورود کالا از طریق سیستم خارجی
            </p>
            <div className="p-3 rounded-lg bg-muted">
              <pre className="text-xs font-mono overflow-x-auto" dir="ltr">{`{
  "product_id": 1,
  "quantity": 50.5,
  "supplier": "تامین کننده نمونه",
  "reference_number": "INV-12345",
  "notes": "یادداشت اختیاری"
}`}</pre>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">POST</Badge>
              <code className="text-sm" dir="ltr">/api/external/stock-out</code>
            </div>
            <p className="text-sm text-muted-foreground">
              ثبت خروج کالا از طریق سیستم خارجی
            </p>
            <div className="p-3 rounded-lg bg-muted">
              <pre className="text-xs font-mono overflow-x-auto" dir="ltr">{`{
  "product_id": 1,
  "quantity": 25.5,
  "recipient": "گیرنده نمونه",
  "reference_number": "OUT-12345",
  "notes": "یادداشت اختیاری"
}`}</pre>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Badge variant="default">GET</Badge>
              <code className="text-sm" dir="ltr">/api/external/inventory</code>
            </div>
            <p className="text-sm text-muted-foreground">
              دریافت گزارش کامل موجودی انبار با هشدارهای موجودی کم
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            محدودیت‌ها و امنیت
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="size-2 rounded-full bg-primary mt-2" />
            <p className="text-sm">
              نرخ محدودیت: 100 درخواست در دقیقه به ازای هر توکن API
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="size-2 rounded-full bg-primary mt-2" />
            <p className="text-sm">
              تمام درخواست‌ها باید از طریق HTTPS ارسال شوند
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="size-2 rounded-full bg-primary mt-2" />
            <p className="text-sm">
              توکن‌های API باید به صورت محرمانه نگهداری شوند
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="size-2 rounded-full bg-primary mt-2" />
            <p className="text-sm">
              کدهای خطا: 401 (عدم احراز هویت), 403 (عدم دسترسی), 429 (بیش از حد درخواست)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            اطلاعات پایگاه داده
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">نوع پایگاه داده:</span> PostgreSQL (Neon)
            </p>
            <p className="text-sm">
              <span className="font-medium">نسخه Prisma:</span> 6.2.0
            </p>
            <p className="text-sm">
              <span className="font-medium">رمزنگاری رمز عبور:</span> bcrypt
            </p>
            <p className="text-sm">
              <span className="font-medium">نوع احراز هویت:</span> NextAuth.js (JWT)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
