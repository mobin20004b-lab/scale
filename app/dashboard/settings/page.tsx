"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Check, Code, Copy, Database, Key, Lock, Settings, Shield, UserCog, Users } from "lucide-react"

type UserRole = "ADMIN" | "USER" | "VIEWER"

type UserItem = {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
}

type SystemSettings = {
  api: {
    enabled: boolean
    rateLimitPerMinute: number
    token: string
  }
  security: {
    requireStrongPassword: boolean
    forceRotation: boolean
    rotationDays: number
  }
  general: {
    systemLanguage: string
    timezone: string
    notificationsEnabled: boolean
    companyNote: string
  }
}

const apiEndpoints = [
  { method: "GET", path: "/api/external/products", description: "دریافت لیست تمام محصولات با موجودی فعلی" },
  { method: "GET", path: "/api/external/product/:id", description: "دریافت اطلاعات کامل یک محصول خاص" },
  { method: "POST", path: "/api/external/stock-in", description: "ثبت ورود کالا از طریق سیستم خارجی (نیازمند هدر Idempotency-Key)" },
  { method: "POST", path: "/api/external/stock-out", description: "ثبت خروج کالا از طریق سیستم خارجی (نیازمند هدر Idempotency-Key)" },
  { method: "GET", path: "/api/external/inventory", description: "گزارش کامل موجودی انبار" }
]

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [users, setUsers] = useState<UserItem[]>([])
  const [settings, setSettings] = useState<SystemSettings | null>(null)

  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState<UserRole>("USER")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [lastCopied, setLastCopied] = useState<string | null>(null)

  const activeUsers = useMemo(() => users.filter((user) => user.active).length, [users])

  const loadData = async () => {
    try {
      const response = await fetch("/api/settings", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("load failed")
      }

      const data = (await response.json()) as { users: UserItem[]; settings: SystemSettings }
      setUsers(data.users)
      setSettings(data.settings)
    } catch {
      toast.error("دریافت تنظیمات با خطا مواجه شد")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveSettings = async (nextSettings: SystemSettings) => {
    setSettings(nextSettings)
    setIsSaving(true)
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: nextSettings })
      })

      if (!response.ok) {
        throw new Error("save failed")
      }

      toast.success("تنظیمات ذخیره شد")
    } catch {
      toast.error("ذخیره تنظیمات ناموفق بود")
      await loadData()
    } finally {
      setIsSaving(false)
    }
  }

  const addUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error("نام، ایمیل و رمز عبور الزامی است")
      return
    }

    try {
      const response = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          password: newUserPassword
        })
      })

      if (!response.ok) {
        throw new Error("create failed")
      }

      const data = (await response.json()) as { user: UserItem }
      setUsers((prev) => [data.user, ...prev])
      setNewUserName("")
      setNewUserEmail("")
      setNewUserRole("USER")
      setNewUserPassword("")
      toast.success("کاربر افزوده شد")
    } catch {
      toast.error("افزودن کاربر انجام نشد")
    }
  }

  const toggleUser = async (id: string, active: boolean) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, active } : user)))
    try {
      const response = await fetch(`/api/settings/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active })
      })

      if (!response.ok) {
        throw new Error("toggle failed")
      }
    } catch {
      toast.error("تغییر وضعیت کاربر ناموفق بود")
      await loadData()
    }
  }

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setLastCopied(key)
    setTimeout(() => setLastCopied((current) => (current === key ? null : current)), 1800)
  }


  const printTestLabel = async () => {
    const response = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "test", size: "50x30", templateVersion: "v1" }),
    })

    if (!response.ok) {
      toast.error("چاپ لیبل تست ناموفق بود")
      return
    }

    const data = (await response.json()) as { html: string }
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=700")
    if (!printWindow) {
      toast.error("پنجره چاپ توسط مرورگر مسدود شد")
      return
    }

    printWindow.document.write(data.html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const rotateToken = () => {
    if (!settings) {
      return
    }

    const next = {
      ...settings,
      api: {
        ...settings.api,
        token: `sk_live_${crypto.randomUUID().replaceAll("-", "")}`
      }
    }

    void saveSettings(next)
  }

  if (isLoading || !settings) {
    return <div className="text-sm text-muted-foreground">در حال دریافت تنظیمات...</div>
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
            <Badge variant={settings.api.enabled ? "default" : "secondary"}>{settings.api.enabled ? "فعال" : "غیرفعال"}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="size-4" /> چرخش رمز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{settings.security.rotationDays} روز</p>
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-5">
                <Input placeholder="نام کاربر" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
                <Input placeholder="ایمیل" dir="ltr" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} />
                <Input placeholder="رمز عبور" dir="ltr" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
                <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="نقش" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="VIEWER">VIEWER</SelectItem>
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
                        <td className="p-3"><Badge variant="secondary">{user.role}</Badge></td>
                        <td className="p-3"><Badge variant={user.active ? "default" : "secondary"}>{user.active ? "فعال" : "غیرفعال"}</Badge></td>
                        <td className="p-3">
                          <Button variant="outline" size="sm" onClick={() => toggleUser(user.id, !user.active)}>
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
              <CardTitle className="flex items-center gap-2"><UserCog className="size-5" /> مدیریت API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">فعال‌سازی API خارجی</p>
                  <div className="flex items-center gap-3">
                    <Switch checked={settings.api.enabled} onCheckedChange={(value) => void saveSettings({ ...settings, api: { ...settings.api, enabled: value } })} />
                    <span className="text-sm text-muted-foreground">{settings.api.enabled ? "فعال" : "غیرفعال"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">محدودیت درخواست در دقیقه</p>
                  <Input dir="ltr" value={String(settings.api.rateLimitPerMinute)} onChange={(event) => setSettings({ ...settings, api: { ...settings.api, rateLimitPerMinute: Number(event.target.value || 0) } })} onBlur={() => void saveSettings(settings)} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">توکن API</p>
                <div className="flex gap-2">
                  <Input dir="ltr" value={settings.api.token} onChange={(event) => setSettings({ ...settings, api: { ...settings.api, token: event.target.value } })} onBlur={() => void saveSettings(settings)} />
                  <Button variant="outline" onClick={rotateToken}>چرخش توکن</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="size-5" /> امنیت و تغییر رمز عبور</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">الزام رمز قوی</span>
                  <Switch checked={settings.security.requireStrongPassword} onCheckedChange={(value) => void saveSettings({ ...settings, security: { ...settings.security, requireStrongPassword: value } })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">الزام تغییر دوره‌ای رمز عبور</span>
                  <Switch checked={settings.security.forceRotation} onCheckedChange={(value) => void saveSettings({ ...settings, security: { ...settings.security, forceRotation: value } })} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">دوره تغییر رمز (روز)</p>
                  <Input dir="ltr" value={String(settings.security.rotationDays)} onChange={(event) => setSettings({ ...settings, security: { ...settings.security, rotationDays: Number(event.target.value || 0) } })} onBlur={() => void saveSettings(settings)} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" disabled>خروج همه نشست‌های فعال</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="size-5" /> تنظیمات عمومی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">زبان سیستم</p>
                  <Select value={settings.general.systemLanguage} onValueChange={(value) => void saveSettings({ ...settings, general: { ...settings.general, systemLanguage: value } })}>
                    <SelectTrigger><SelectValue placeholder="زبان" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fa">فارسی</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">منطقه زمانی</p>
                  <Input dir="ltr" value={settings.general.timezone} onChange={(event) => setSettings({ ...settings, general: { ...settings.general, timezone: event.target.value } })} onBlur={() => void saveSettings(settings)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">فعال‌سازی اعلان‌ها</span>
                <Switch checked={settings.general.notificationsEnabled} onCheckedChange={(value) => void saveSettings({ ...settings, general: { ...settings.general, notificationsEnabled: value } })} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">یادداشت داخلی</p>
                <Textarea value={settings.general.companyNote} onChange={(event) => setSettings({ ...settings, general: { ...settings.general, companyNote: event.target.value } })} onBlur={() => void saveSettings(settings)} rows={4} />
              </div>

              <div className="rounded-lg border p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">چاپ تست لیبل</p>
                  <p className="text-xs text-muted-foreground">برای بررسی سریع چاپگر حرارتی و قالب نسخه v1</p>
                </div>
                <Button type="button" variant="outline" onClick={() => void printTestLabel()}>Print test label</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="size-5" /> مستندات API</CardTitle>
              <CardDescription>وضعیت ذخیره: {isSaving ? "در حال ذخیره..." : "ذخیره شده"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-lg bg-muted flex items-center justify-between gap-3">
                <p className="text-sm font-mono" dir="ltr">Authorization: Bearer YOUR_API_TOKEN</p>
                <Button variant="outline" size="sm" onClick={() => copyText("auth-header", "Authorization: Bearer YOUR_API_TOKEN")}>
                  {lastCopied === "auth-header" ? <Check className="size-4" /> : <Copy className="size-4" />}کپی هدر
                </Button>
              </div>
              {apiEndpoints.map((endpoint) => (
                <div key={endpoint.path} className="rounded-lg border p-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={endpoint.method === "POST" ? "secondary" : "default"}>{endpoint.method}</Badge>
                      <code dir="ltr" className="text-sm">{endpoint.path}</code>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyText(`endpoint-${endpoint.path}`, endpoint.path)}>
                      {lastCopied === `endpoint-${endpoint.path}` ? <Check className="size-4" /> : <Copy className="size-4" />}کپی
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="size-5" /> اطلاعات فنی</CardTitle>
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
