"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Bell, Menu } from "lucide-react"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DateTimeText } from "@/components/date-time-text"

interface DashboardHeaderProps {
  user: any
  onOpenMobileNav?: () => void
}

export function DashboardHeader({ user, onOpenMobileNav }: DashboardHeaderProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b bg-card">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMobileNav}
          aria-label="باز کردن منوی ناوبری"
        >
          <Menu className="size-5" />
        </Button>
        <h1 className="text-base md:text-xl font-semibold truncate">
          خوش آمدید، {user?.name}
        </h1>
        <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
          <DateTimeText value={new Date()} />
        </Badge>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="اعلان‌ها">
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
                <span className="text-xs text-muted-foreground">5 محصول در وضعیت بحرانی</span>
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
