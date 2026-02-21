"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Locale } from "@/lib/i18n"

interface DashboardShellProps {
  user: any
  locale: Locale
  children: React.ReactNode
}

export function DashboardShell({ user, locale, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      <DashboardSidebar user={user} className="hidden md:flex" />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="right" className="w-72 p-0 md:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>منوی ناوبری</SheetTitle>
          </SheetHeader>
          <DashboardSidebar user={user} className="w-full border-l-0" onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <DashboardHeader user={user} locale={locale} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
