"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Warehouse, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const showDevCredentialHint =
    process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SHOW_DEV_LOGIN_HINT === "true"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false
      })

      if (result?.error) {
        toast.error("نام کاربری یا رمز عبور اشتباه است")
      } else {
        toast.success("ورود موفقیت‌آمیز")
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      toast.error("خطا در ورود به سیستم")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md" dir="rtl">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="flex items-center justify-center size-16 rounded-full bg-primary/10">
            <Warehouse className="size-8 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">سیستم مدیریت انبار</CardTitle>
          <CardDescription>لطفا اطلاعات خود را وارد کنید</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">نام کاربری</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="ml-2 size-4 animate-spin" />
                در حال ورود...
              </>
            ) : (
              "ورود"
            )}
          </Button>
        </form>
        {showDevCredentialHint ? (
          <div className="mt-4 text-sm text-center text-muted-foreground">
            <p>حساب آزمایشی: admin / admin123</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
