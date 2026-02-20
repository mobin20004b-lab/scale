"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Check, Code, Copy, Database, Key, Lock, Settings, Shield, UserCog, Users } from "lucide-react"

type UserItem = {
  id: number
  name: string
  email: string
  role: string
  active: boolean
}

const initialUsers: UserItem[] = [
  { id: 1, name: "علی رضایی", email: "ali@warehouse.local", role: "ADMIN", active: true },
  { id: 2, name: "مریم احمدی", email: "maryam@warehouse.local", role: "MANAGER", active: true },
  { id: 3, name: "سینا محمدی", email: "sina@warehouse.local", role: "OPERATOR", active: false }
]

const apiEndpoints = [
  { method: "GET", path: "/api/external/products", description: "دریافت لیست تمام محصولات با موجودی فعلی" },
  { method: "GET", path: "/api/external/product/:id", description: "دریافت اطلاعات کامل یک محصول خاص" },
  { method: "POST", path: "/api/external/stock-in", description: "ثبت ورود کالا از طریق سیستم خارجی" },
  { method: "POST", path: "/api/external/stock-out", description: "ثبت خروج کالا از طریق سیستم خارجی" },
  { method: "GET", path: "/api/external/inventory", description: "گزارش کامل موجودی انبار" }
]

type ApiExample = {
  id: string
  job: string
  title: string
  endpoint: string
  curlCommand: string
  responseSnippet: string
  description: string
}

const apiExamples: ApiExample[] = [
  {
    id: "inventory-sync",
    job: "همگام‌سازی موجودی",
    title: "دریافت گزارش کامل موجودی",
    endpoint: "/api/external/inventory",
    description: "برای همگام‌سازی اولیه یا بروزرسانی دوره‌ای موجودی در ERP/CRM استفاده کنید.",
    curlCommand:
      "curl -X GET 'https://your-domain.com/api/external/inventory' \\\n+  -H 'Authorization: Bearer YOUR_API_TOKEN'",
    responseSnippet: `{
  "summary": {
    "totalProducts": 42,
    "lowStockCount": 5,
    "updatedAt": "2026-02-18T09:42:11.000Z"
  },
  "inventory": [
    {
      "id": 101,
      "name": "برنج طارم",
      "stock": 320,
      "unit": "کیلوگرم"
    }
  ]
}`
  },
  {
    id: "stock-in",
    job: "ثبت ورود کالا",
    title: "افزایش موجودی پس از دریافت کالا",
    endpoint: "/api/external/stock-in",
    description: "بعد از تحویل از تامین‌کننده، مقدار ورودی را در انبار ثبت کنید.",
    curlCommand:
      "curl -X POST 'https://your-domain.com/api/external/stock-in' \\\n+  -H 'Authorization: Bearer YOUR_API_TOKEN' \\\n+  -H 'Content-Type: application/json' \\\n+  -d '{\"productId\":101,\"quantity\":25.5}'",
    responseSnippet: `{
  "message": "Stock in recorded successfully",
  "product": {
    "id": 101,
    "name": "برنج طارم",
    "stock": 345.5,
    "unit": "کیلوگرم"
  },
  "transaction": {
    "type": "IN",
    "quantity": 25.5
  }
}`
  },
  {
    id: "stock-out",
    job: "ثبت خروج کالا",
    title: "کاهش موجودی هنگام فروش/مصرف",
    endpoint: "/api/external/stock-out",
    description: "برای ثبت خروج کالا پس از فروش یا مصرف داخلی استفاده کنید.",
    curlCommand:
      "curl -X POST 'https://your-domain.com/api/external/stock-out' \\\n+  -H 'Authorization: Bearer YOUR_API_TOKEN' \\\n+  -H 'Content-Type: application/json' \\\n+  -d '{\"productId\":101,\"quantity\":10}'",
    responseSnippet: `{
  "message": "Stock out recorded successfully",
  "product": {
    "id": 101,
    "name": "برنج طارم",
    "stock": 335.5,
    "unit": "کیلوگرم"
  },
  "transaction": {
    "type": "OUT",
    "quantity": 10
  }
}`
  }
]

export default function SettingsPage() {
  const [users, setUsers] = useState(initialUsers)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState("OPERATOR")

  const [apiRateLimit, setApiRateLimit] = useState("100")
  const [apiToken, setApiToken] = useState("sk_live_warehouse_2026")
  const [apiEnabled, setApiEnabled] = useState(true)

  const [requireStrongPassword, setRequireStrongPassword] = useState(true)
  const [forceRotation, setForceRotation] = useState(true)
  const [rotationDays, setRotationDays] = useState("90")

  const [systemLanguage, setSystemLanguage] = useState("fa")
  const [timezone, setTimezone] = useState("Asia/Tehran")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [companyNote, setCompanyNote] = useState("ثبت دقیق ورودی/خروجی برای کنترل موجودی الزامی است.")
  const [lastCopied, setLastCopied] = useState<string | null>(null)

  const activeUsers = useMemo(() => users.filter((user) => user.active).length, [users])

  const addUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      return
    }

    const newUser: UserItem = {
      id: Date.now(),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      active: true
    }

    setUsers((prev) => [newUser, ...prev])
    setNewUserName("")
    setNewUserEmail("")
    setNewUserRole("OPERATOR")
  }

  const toggleUser = (id: number) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, active: !user.active } : user)))
  }

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setLastCopied(key)
    setTimeout(() => setLastCopied((current) => (current === key ? null : current)), 1800)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">تنظیمات سیستم</h2>
        <p className="text-muted-foreground">تنظیمات اصلی، مدیریت کاربران، API و امنیت در یک صفحه</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4" /> کاربران فعال
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCog className="size-4" /> نقش‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">3</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="size-4" /> وضعیت API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={apiEnabled ? "default" : "secondary"}>{apiEnabled ? "فعال" : "غیرفعال"}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="size-4" /> چرخش رمز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rotationDays} روز</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="gap-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">مدیریت کاربران</TabsTrigger>
          <TabsTrigger value="api">مدیریت API</TabsTrigger>
          <TabsTrigger value="security">امنیت و رمز</TabsTrigger>
          <TabsTrigger value="general">تنظیمات عمومی</TabsTrigger>
          <TabsTrigger value="docs">مستندات</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" /> مدیریت کاربران
              </CardTitle>
              <CardDescription>افزودن کاربر جدید، تخصیص نقش و فعال/غیرفعال کردن کاربران</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Input placeholder="نام کاربر" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
                <Input placeholder="ایمیل" dir="ltr" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} />
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="نقش" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="MANAGER">MANAGER</SelectItem>
                    <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addUser}>افزودن کاربر</Button>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3">نام</th>
                      <th className="text-right p-3">ایمیل</th>
                      <th className="text-right p-3">نقش</th>
                      <th className="text-right p-3">وضعیت</th>
                      <th className="text-right p-3">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t">
                        <td className="p-3">{user.name}</td>
                        <td className="p-3" dir="ltr">{user.email}</td>
                        <td className="p-3">
                          <Badge variant="secondary">{user.role}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={user.active ? "default" : "secondary"}>{user.active ? "فعال" : "غیرفعال"}</Badge>
                        </td>
                        <td className="p-3">
                          <Button variant="outline" size="sm" onClick={() => toggleUser(user.id)}>
                            {user.active ? "غیرفعال کردن" : "فعال کردن"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="size-5" /> مدیریت API
              </CardTitle>
              <CardDescription>تنظیم وضعیت API، محدودیت نرخ و توکن دسترسی</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">فعال‌سازی API خارجی</p>
                  <div className="flex items-center gap-3">
                    <Switch checked={apiEnabled} onCheckedChange={setApiEnabled} />
                    <span className="text-sm text-muted-foreground">{apiEnabled ? "فعال" : "غیرفعال"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">محدودیت درخواست در دقیقه</p>
                  <Input dir="ltr" value={apiRateLimit} onChange={(event) => setApiRateLimit(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">توکن API</p>
                <div className="flex gap-2">
                  <Input dir="ltr" value={apiToken} onChange={(event) => setApiToken(event.target.value)} />
                  <Button variant="outline" onClick={() => setApiToken(`sk_live_warehouse_${Date.now()}`)}>
                    چرخش توکن
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" /> امنیت و تغییر رمز عبور
              </CardTitle>
              <CardDescription>تعریف سیاست رمز عبور و مدیریت نشست‌ها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">الزام رمز قوی (حروف بزرگ، کوچک، عدد و نماد)</span>
                  <Switch checked={requireStrongPassword} onCheckedChange={setRequireStrongPassword} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">الزام تغییر دوره‌ای رمز عبور</span>
                  <Switch checked={forceRotation} onCheckedChange={setForceRotation} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">دوره تغییر رمز (روز)</p>
                  <Input dir="ltr" value={rotationDays} onChange={(event) => setRotationDays(event.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full">خروج همه نشست‌های فعال</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-5" /> تنظیمات عمومی سیستم
              </CardTitle>
              <CardDescription>مدیریت زبان، منطقه زمانی و یادداشت عملیاتی</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">زبان سیستم</p>
                  <Select value={systemLanguage} onValueChange={setSystemLanguage}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fa">فارسی</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">منطقه زمانی</p>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Tehran">Asia/Tehran</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">اعلان‌های سیستمی فعال باشد</span>
                <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">یادداشت داخلی</p>
                <Textarea value={companyNote} onChange={(event) => setCompanyNote(event.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="size-5" /> مستندات API
              </CardTitle>
              <CardDescription>مستندات در تب جداگانه قرار گرفت تا از تنظیمات عملیاتی جدا باشد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-lg bg-muted flex items-center justify-between gap-3">
                <p className="text-sm font-mono" dir="ltr">Authorization: Bearer YOUR_API_TOKEN</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText("auth-header", "Authorization: Bearer YOUR_API_TOKEN")}
                >
                  {lastCopied === "auth-header" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  کپی هدر
                </Button>
              </div>
              {apiEndpoints.map((endpoint) => (
                <div key={endpoint.path} className="rounded-lg border p-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={endpoint.method === "POST" ? "secondary" : "default"}>{endpoint.method}</Badge>
                      <code dir="ltr" className="text-sm">{endpoint.path}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyText(`endpoint-${endpoint.path}`, endpoint.path)}
                    >
                      {lastCopied === `endpoint-${endpoint.path}` ? <Check className="size-4" /> : <Copy className="size-4" />}
                      کپی
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                </div>
              ))}

              <div className="space-y-4 pt-2">
                <h4 className="font-medium">سناریوهای آماده اجرا (cURL + پاسخ JSON)</h4>
                {apiExamples.map((example) => (
                  <div key={example.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{example.job}</Badge>
                      <p className="text-sm font-medium">{example.title}</p>
                      <code dir="ltr" className="text-xs text-muted-foreground">{example.endpoint}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{example.description}</p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">cURL</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyText(`curl-${example.id}`, example.curlCommand)}
                        >
                          {lastCopied === `curl-${example.id}` ? <Check className="size-4" /> : <Copy className="size-4" />}
                          کپی cURL
                        </Button>
                      </div>
                      <pre dir="ltr" className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                        <code>{example.curlCommand}</code>
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">JSON Response</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyText(`response-${example.id}`, example.responseSnippet)}
                        >
                          {lastCopied === `response-${example.id}` ? <Check className="size-4" /> : <Copy className="size-4" />}
                          کپی JSON
                        </Button>
                      </div>
                      <pre dir="ltr" className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                        <code>{example.responseSnippet}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5" /> اطلاعات فنی
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="font-medium">نوع پایگاه داده:</span> PostgreSQL (Neon)</p>
              <p><span className="font-medium">نسخه Prisma:</span> 6.2.0</p>
              <p><span className="font-medium">رمزنگاری رمز عبور:</span> bcrypt</p>
              <p><span className="font-medium">نوع احراز هویت:</span> NextAuth.js (JWT)</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
