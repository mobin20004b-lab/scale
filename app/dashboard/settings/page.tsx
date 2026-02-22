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
import { DEFAULT_LOCALE, getDictionary } from "@/lib/i18n"

type UserRole = "ADMIN" | "USER" | "VIEWER"
type SettingsTab = "users" | "api" | "security" | "general" | "docs"
type EditableSettingsTab = "api" | "security" | "general"

type UserAccess = {
  operations: boolean
  reports: boolean
  scales: boolean
  settings: boolean
}

type UserItem = {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  access: UserAccess
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

const editableTabs: EditableSettingsTab[] = ["api", "security", "general"]

const apiEndpoints = [
  { method: "GET", path: "/api/external/products", description: "دریافت لیست تمام محصولات با موجودی فعلی" },
  { method: "GET", path: "/api/external/product/:id", description: "دریافت اطلاعات کامل یک محصول خاص" },
  { method: "POST", path: "/api/external/stock-in", description: "ثبت ورود کالا از طریق سیستم خارجی (نیازمند هدر Idempotency-Key)" },
  { method: "POST", path: "/api/external/stock-out", description: "ثبت خروج کالا از طریق سیستم خارجی (نیازمند هدر Idempotency-Key)" },
  { method: "GET", path: "/api/external/inventory", description: "گزارش کامل موجودی انبار" }
]

const sectionEqual = <K extends EditableSettingsTab>(a: SystemSettings, b: SystemSettings, section: K) => JSON.stringify(a[section]) === JSON.stringify(b[section])

export default function SettingsPage() {
  const t = getDictionary(DEFAULT_LOCALE)

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingTab, setIsSavingTab] = useState<EditableSettingsTab | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [baselineSettings, setBaselineSettings] = useState<SystemSettings | null>(null)
  const [activeTab, setActiveTab] = useState<SettingsTab>("users")

  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState<UserRole>("USER")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [lastCopied, setLastCopied] = useState<string | null>(null)

  const activeUsers = useMemo(() => users.filter((user) => user.active).length, [users])

  const dirtyTabs = useMemo(() => {
    if (!settings || !baselineSettings) {
      return { api: false, security: false, general: false }
    }

    return {
      api: !sectionEqual(settings, baselineSettings, "api"),
      security: !sectionEqual(settings, baselineSettings, "security"),
      general: !sectionEqual(settings, baselineSettings, "general")
    }
  }, [baselineSettings, settings])

  const hasUnsavedChanges = dirtyTabs.api || dirtyTabs.security || dirtyTabs.general

  const loadData = async () => {
    try {
      const response = await fetch("/api/settings", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("load failed")
      }

      const data = (await response.json()) as { users: UserItem[]; settings: SystemSettings }
      setUsers(data.users)
      setSettings(data.settings)
      setBaselineSettings(data.settings)
    } catch {
      toast.error("دریافت تنظیمات با خطا مواجه شد")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return
      }

      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [hasUnsavedChanges])

  const saveSettingsForTab = async (tab: EditableSettingsTab) => {
    if (!settings || !baselineSettings || !dirtyTabs[tab]) {
      return
    }

    const candidateSettings = settings
    setIsSavingTab(tab)

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: candidateSettings })
      })

      if (!response.ok) {
        throw new Error("save failed")
      }

      const data = (await response.json()) as { settings: SystemSettings }
      setSettings(data.settings)
      setBaselineSettings(data.settings)
      toast.success("تغییرات ذخیره شد")
    } catch {
      try {
        const latestResponse = await fetch("/api/settings", { cache: "no-store" })
        if (latestResponse.ok) {
          const latestData = (await latestResponse.json()) as { settings: SystemSettings }
          const hasConflict = !sectionEqual(latestData.settings, baselineSettings, tab)
          setBaselineSettings(latestData.settings)

          if (hasConflict) {
            toast.error("تنظیمات این بخش توسط کاربر دیگری تغییر کرده است. لطفاً بازبینی و مجدد ذخیره کنید")
          } else {
            toast.error("ذخیره تنظیمات ناموفق بود")
          }
          return
        }
      } catch {
        // best-effort conflict detection
      }

      toast.error("ذخیره تنظیمات ناموفق بود")
    } finally {
      setIsSavingTab(null)
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


  const updateUserAccess = async (id: string, access: UserAccess) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, access } : user)))

    try {
      const response = await fetch(`/api/settings/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access })
      })

      if (!response.ok) {
        throw new Error("access update failed")
      }

      toast.success("دسترسی کاربر ذخیره شد")
    } catch {
      toast.error("ذخیره دسترسی کاربر ناموفق بود")
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

    setSettings({
      ...settings,
      api: {
        ...settings.api,
        token: `sk_live_${crypto.randomUUID().replaceAll("-", "")}`
      }
    })
  }

  const handleTabChange = (nextTab: string) => {
    if (nextTab === activeTab) {
      return
    }

    if (hasUnsavedChanges && !window.confirm("تغییرات ذخیره‌نشده دارید. آیا می‌خواهید بدون ذخیره‌سازی جابه‌جا شوید؟")) {
      return
    }

    setActiveTab(nextTab as SettingsTab)
  }

  const saveActions = (tab: EditableSettingsTab) => (
    <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2">
      <p className="text-xs text-muted-foreground">
        {dirtyTabs[tab] ? "تغییرات ذخیره‌نشده دارید" : "تمام تغییرات این بخش ذخیره شده است"}
      </p>
      <Button type="button" size="sm" onClick={() => void saveSettingsForTab(tab)} disabled={!dirtyTabs[tab] || isSavingTab !== null}>
        {isSavingTab === tab ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </Button>
    </div>
  )

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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">مدیریت کاربران</TabsTrigger>
          <TabsTrigger value="api" className="gap-2">مدیریت API {dirtyTabs.api ? <span className="size-2 rounded-full bg-amber-500" /> : null}</TabsTrigger>
          <TabsTrigger value="security" className="gap-2">امنیت و رمز {dirtyTabs.security ? <span className="size-2 rounded-full bg-amber-500" /> : null}</TabsTrigger>
          <TabsTrigger value="general" className="gap-2">تنظیمات عمومی {dirtyTabs.general ? <span className="size-2 rounded-full bg-amber-500" /> : null}</TabsTrigger>
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
                      <th className="text-right p-3">دسترسی</th>
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
                          {user.role === "ADMIN" ? (
                            <span className="text-xs text-muted-foreground">دسترسی کامل</span>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={user.access.operations} onChange={(event) => updateUserAccess(user.id, { ...user.access, operations: event.target.checked })} />عملیات</label>
                              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={user.access.reports} onChange={(event) => updateUserAccess(user.id, { ...user.access, reports: event.target.checked })} />گزارش</label>
                              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={user.access.scales} onChange={(event) => updateUserAccess(user.id, { ...user.access, scales: event.target.checked })} />ترازو</label>
                              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={user.access.settings} onChange={(event) => updateUserAccess(user.id, { ...user.access, settings: event.target.checked })} />تنظیمات</label>
                            </div>
                          )}
                        </td>
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
                    <Switch checked={settings.api.enabled} onCheckedChange={(value) => setSettings({ ...settings, api: { ...settings.api, enabled: value } })} />
                    <span className="text-sm text-muted-foreground">{settings.api.enabled ? "فعال" : "غیرفعال"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">محدودیت درخواست در دقیقه</p>
                  <Input dir="ltr" value={String(settings.api.rateLimitPerMinute)} onChange={(event) => setSettings({ ...settings, api: { ...settings.api, rateLimitPerMinute: Number(event.target.value || 0) } })} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">توکن API</p>
                <div className="flex gap-2">
                  <Input dir="ltr" value={settings.api.token} onChange={(event) => setSettings({ ...settings, api: { ...settings.api, token: event.target.value } })} />
                  <Button variant="outline" onClick={rotateToken}>چرخش توکن</Button>
                </div>
              </div>

              {saveActions("api")}
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
                  <Switch checked={settings.security.requireStrongPassword} onCheckedChange={(value) => setSettings({ ...settings, security: { ...settings.security, requireStrongPassword: value } })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">الزام تغییر دوره‌ای رمز عبور</span>
                  <Switch checked={settings.security.forceRotation} onCheckedChange={(value) => setSettings({ ...settings, security: { ...settings.security, forceRotation: value } })} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">دوره تغییر رمز (روز)</p>
                  <Input dir="ltr" value={String(settings.security.rotationDays)} onChange={(event) => setSettings({ ...settings, security: { ...settings.security, rotationDays: Number(event.target.value || 0) } })} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" disabled>خروج همه نشست‌های فعال</Button>
                </div>
              </div>

              {saveActions("security")}
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
                  <Select value={settings.general.systemLanguage} onValueChange={(value) => setSettings({ ...settings, general: { ...settings.general, systemLanguage: value } })}>
                    <SelectTrigger><SelectValue placeholder="زبان" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fa">فارسی</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">منطقه زمانی</p>
                  <Input dir="ltr" value={settings.general.timezone} onChange={(event) => setSettings({ ...settings, general: { ...settings.general, timezone: event.target.value } })} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">فعال‌سازی اعلان‌ها</span>
                <Switch checked={settings.general.notificationsEnabled} onCheckedChange={(value) => setSettings({ ...settings, general: { ...settings.general, notificationsEnabled: value } })} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">یادداشت داخلی</p>
                <Textarea value={settings.general.companyNote} onChange={(event) => setSettings({ ...settings, general: { ...settings.general, companyNote: event.target.value } })} rows={4} />
              </div>

              <div className="rounded-lg border p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">چاپ تست لیبل</p>
                  <p className="text-xs text-muted-foreground">برای بررسی سریع چاپگر حرارتی و قالب نسخه v1</p>
                </div>
                <Button type="button" variant="outline" onClick={() => void printTestLabel()}>{t.common.printTestLabel}</Button>
              </div>

              {saveActions("general")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="size-5" /> مستندات API</CardTitle>
              <CardDescription>وضعیت ذخیره: {hasUnsavedChanges ? "تغییرات ذخیره‌نشده" : "ذخیره شده"}</CardDescription>
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
