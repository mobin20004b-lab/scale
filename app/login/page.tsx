import { LoginForm } from "@/components/login-form"
import { auth } from "@/lib/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldAlert } from "lucide-react"
import { redirect } from "next/navigation"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const [session, params] = await Promise.all([auth(), searchParams])

  if (session?.user) {
    redirect("/dashboard")
  }

  const showSessionMessage = params.reason === "session"

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md space-y-4">
        {showSessionMessage ? (
          <Alert>
            <ShieldAlert className="size-4" />
            <AlertTitle>نشست کاربری معتبر نیست</AlertTitle>
            <AlertDescription>
              نشست شما پایان یافته یا حساب کاربری‌تان دیگر در دسترس نیست. لطفاً دوباره وارد شوید.
            </AlertDescription>
          </Alert>
        ) : null}
        <LoginForm />
      </div>
    </div>
  )
}
