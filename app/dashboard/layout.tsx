import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { getSessionLocale } from "@/lib/i18n-server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const locale = await getSessionLocale()

  return (
    <DashboardShell user={session.user} locale={locale}>
      {children}
    </DashboardShell>
  )
}
