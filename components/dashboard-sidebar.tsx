"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Warehouse,
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageMinus,
  BarChart3,
  Settings,
  History,
  Scale
} from "lucide-react"

const navItems = [
  {
    title: "داشبورد",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    title: "محصولات",
    href: "/dashboard/products",
    icon: Package
  },
  {
    title: "ورود کالا",
    href: "/dashboard/stock-in",
    icon: PackagePlus
  },
  {
    title: "خروج کالا",
    href: "/dashboard/stock-out",
    icon: PackageMinus
  },
  {
    title: "گزارش‌ها",
    href: "/dashboard/reports",
    icon: BarChart3
  },
  {
    title: "سوابق",
    href: "/dashboard/activity",
    icon: History
  },
  {
    title: "انبارها و باسکول‌ها",
    href: "/dashboard/scales",
    icon: Scale
  },
  {
    title: "تنظیمات",
    href: "/dashboard/settings",
    icon: Settings
  }
]

interface DashboardSidebarProps {
  user: any
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 border-l bg-card">
      <div className="flex items-center gap-3 p-6 border-b">
        <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-primary-foreground">
          <Warehouse className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg">انبارداری</span>
          <span className="text-xs text-muted-foreground">مدیریت هوشمند</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
          <div className="flex items-center justify-center size-9 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">
              {(user as any)?.role === "ADMIN" ? "مدیر سیستم" : "کاربر"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
