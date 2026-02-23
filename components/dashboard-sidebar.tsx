"use client";

import type { ComponentType, KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasDashboardAccess } from "@/lib/access-control";
import {
  Warehouse,
  LayoutDashboard,
  Package,
  PackagePlus,
  BarChart3,
  Settings,
  History,
  Weight,
  ArrowDownToLine,
  ArrowUpFromLine,
  ScanSearch,
  Shield,
  Users,
  Radio,
  Printer,
  Barcode,
} from "lucide-react";

interface NavItem {
  title: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "عملیات روزانه",
    items: [
      { title: "خانه", href: "/dashboard", icon: LayoutDashboard },
      { title: "دریافت", href: "/dashboard/stock-in", icon: ArrowDownToLine },
      { title: "ارسال", href: "/dashboard/stock-out", icon: ArrowUpFromLine },
      { title: "شمارش و اصلاح", href: "/dashboard/movements", icon: PackagePlus },
    ],
  },
  {
    title: "هوشمندی موجودی",
    items: [
      { title: "محصولات", href: "/dashboard/products", icon: Package },
      { title: "انبارها و نواحی", href: "/dashboard/warehouses", icon: Warehouse },
      ],
  },
  {
    title: "برج کنترل",
    items: [
      { title: "گزارش‌ها", href: "/dashboard/reports", icon: BarChart3 },
      { title: "پایش زنده", href: "/dashboard/scales", icon: Radio, badge: "Live" },
    ],
  },
  {
    title: "مدیریت",
    items: [
      { title: "تنظیمات سیستم", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

interface DashboardSidebarProps {
  user: any;
  className?: string;
  onNavigate?: () => void;
}

export function DashboardSidebar({
  user,
  className,
  onNavigate,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const role = (user as any)?.role as string | undefined;
  const access = (user as any)?.access as Record<string, boolean> | undefined;

  const handleNavKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'a[data-sidebar-link="true"]'
      )
    );
    const currentIndex = links.indexOf(event.currentTarget);

    if (currentIndex === -1) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % links.length;
      links[nextIndex]?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + links.length) % links.length;
      links[prevIndex]?.focus();
    }

    if (event.key === "Home") {
      event.preventDefault();
      links[0]?.focus();
    }

    if (event.key === "End") {
      event.preventDefault();
      links[links.length - 1]?.focus();
    }
  };

  return (
    <aside className={cn("flex flex-col w-72 border-l bg-card", className)}>
      <div className="flex items-center gap-3 p-6 border-b">
        <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-primary-foreground">
          <Warehouse className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg">انبارداری</span>
          <span className="text-xs text-muted-foreground">جریان کاری سازمانی</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto" aria-label="ناوبری داشبورد">
        {navGroups.map((group) => {
          const allowedItems = group.items.filter((item) =>
            item.href ? hasDashboardAccess(item.href, role, access) : true
          );

          if (allowedItems.length === 0) {
            return null;
          }

          return (
          <section key={group.title} className="space-y-1.5">
            <h2 className="px-3 text-xs font-semibold text-muted-foreground">{group.title}</h2>
            {allowedItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href &&
                (pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href)));

              return (
                <Link
                  key={`${group.title}-${item.title}`}
                  href={item.href ?? "#"}
                  onClick={onNavigate}
                  onKeyDown={handleNavKeyDown}
                  data-sidebar-link="true"
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`رفتن به ${item.title}`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="size-5 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </span>
                  {item.badge ? (
                    <span className="text-[10px] rounded-full border px-2 py-0.5">{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </section>
        )})}
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
  );
}
