"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Bell, Menu } from "lucide-react"
import { signOut } from "next-auth/react"
import { ModeToggle } from "@/components/mode-toggle"
import { Breadcrumbs } from "./breadcrumbs"
import { SidebarContent } from "./dashboard-sidebar"
import { usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface DashboardHeaderProps {
  user: any
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname()
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-card">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-5" />
              <span className="sr-only">باز کردن منو</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-64">
            <SidebarContent user={user} pathname={pathname} />
          </SheetContent>
        </Sheet>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold leading-none">
            خوش آمدید، {user?.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {new Date().toLocaleDateString('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Badge>
            <Breadcrumbs />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5" />
              <span className="absolute top-1 left-1 size-2 bg-destructive rounded-full" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>اعلان‌ها</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">موجودی کم</span>
                <span className="text-xs text-muted-foreground">
                  5 محصول در وضعیت بحرانی
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="ml-2 size-4" />
          خروج
        </Button>
      </div>
    </header>
  )
}
