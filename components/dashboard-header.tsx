"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Bell,
  Menu,
  Search,
  Minus,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Package,
  ScanSearch,
  Settings,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DateTimeText } from "@/components/date-time-text";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { getDictionary, type Locale } from "@/lib/i18n";

interface DashboardHeaderProps {
  user: any;
  locale: Locale;
  onOpenMobileNav?: () => void;
}

const pageCtaMap = [
  { match: "/dashboard/stock-in", label: "ثبت دریافت", href: "/dashboard/stock-in", icon: ArrowDownToLine },
  { match: "/dashboard/stock-out", label: "ثبت ارسال", href: "/dashboard/stock-out", icon: ArrowUpFromLine },
  { match: "/dashboard/products", label: "محصول جدید", href: "/dashboard/products/new", icon: Package },
  { match: "/dashboard/reports", label: "ساخت گزارش", href: "/dashboard/reports", icon: ClipboardList },
  { match: "/dashboard/activity", label: "پیگیری ردیابی", href: "/dashboard/activity", icon: ScanSearch },
  { match: "/dashboard/settings", label: "به‌روزرسانی تنظیمات", href: "/dashboard/settings", icon: Settings },
  { match: "/dashboard", label: "ثبت حرکت جدید", href: "/dashboard/movements", icon: Plus },
] as const;

export function DashboardHeader({
  user,
  locale,
  onOpenMobileNav,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);
  const [recentActionLabels, setRecentActionLabels] = useState<string[]>([]);
  const t = getDictionary(locale);

  const favoriteActions = useMemo(
    () => [
      { label: "ثبت حرکت جدید", href: "/dashboard/movements", icon: Plus, shortcut: "F1" },
      { label: "جست‌وجوی محصول", href: "/dashboard/products", icon: Search, shortcut: "F2" },
    ],
    [],
  );

  const contextualActions = useMemo(() => {
    if (pathname.startsWith("/dashboard/stock-in")) {
      return [
        { label: "دریافت جدید", href: "/dashboard/stock-in", icon: ArrowDownToLine, shortcut: "1" },
        { label: "صف بارکدهای ناشناس", href: "/dashboard/stock-in", icon: ScanSearch, shortcut: "2" },
      ];
    }

    if (pathname.startsWith("/dashboard/stock-out")) {
      return [
        { label: "ارسال جدید", href: "/dashboard/stock-out", icon: ArrowUpFromLine, shortcut: "1" },
        { label: "بررسی موجودی محصول", href: "/dashboard/products", icon: Search, shortcut: "2" },
      ];
    }

    if (pathname.startsWith("/dashboard/products")) {
      return [
        { label: "افزودن محصول", href: "/dashboard/products/new", icon: Plus, shortcut: "1" },
        { label: "چرخه شمارش", href: "/dashboard/movements", icon: ClipboardList, shortcut: "2" },
      ];
    }

    return [
      { label: "ثبت حرکت جدید", href: "/dashboard/movements", icon: Plus, shortcut: "1" },
      { label: "حالت خروج", href: "/dashboard/stock-out", icon: Minus, shortcut: "2" },
      { label: "جست‌وجوی محصول", href: "/dashboard/products", icon: Search, shortcut: "3" },
    ];
  }, [pathname]);

  const primaryCta =
    pageCtaMap.find((item) => pathname.startsWith(item.match) && item.match !== "/dashboard") ??
    pageCtaMap[pageCtaMap.length - 1];

  const allQuickActions = useMemo(() => {
    const seen = new Set<string>();
    return [...contextualActions, ...favoriteActions].filter((item) => {
      if (seen.has(item.label)) return false;
      seen.add(item.label);
      return true;
    });
  }, [contextualActions, favoriteActions]);

  const recentActions = useMemo(
    () =>
      recentActionLabels
        .map((label) => allQuickActions.find((action) => action.label === label))
        .filter((action): action is (typeof allQuickActions)[number] => Boolean(action)),
    [allQuickActions, recentActionLabels],
  );

  const notifications = useMemo(
    () => [
      {
        title: "موجودی کم",
        subtitle: "5 محصول در وضعیت بحرانی",
        href: "/dashboard/products?filter=low-stock",
        unread: true,
      },
      {
        title: "فرمان‌های ناموفق ترازو",
        subtitle: "2 خطا نیازمند بررسی",
        href: "/dashboard/activity?status=FAILED",
        unread: true,
      },
      {
        title: "سفارش‌های خروج معطل",
        subtitle: "3 سفارش تایید نشده",
        href: "/dashboard/stock-out",
        unread: false,
      },
    ],
    [],
  );

  const unreadCount = notifications.filter((item) => item.unread).length;

  useEffect(() => {
    const raw = window.localStorage.getItem("dashboard.quick-actions.recent");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setRecentActionLabels(parsed.slice(0, 5));
      }
    } catch {
      window.localStorage.removeItem("dashboard.quick-actions.recent");
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const runQuickAction = (item: { href: string; label: string }) => {
    const nextRecent = [item.label, ...recentActionLabels.filter((label) => label !== item.label)].slice(0, 5);
    setRecentActionLabels(nextRecent);
    window.localStorage.setItem("dashboard.quick-actions.recent", JSON.stringify(nextRecent));
    setQuickOpen(false);
    router.push(item.href);
  };

  return (
    <>
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
          <Button size="sm" onClick={() => router.push(primaryCta.href)} className="hidden lg:inline-flex">
            <primaryCta.icon className="ml-2 size-4" />
            {primaryCta.label}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickOpen(true)}
            className="hidden sm:inline-flex"
            aria-label="باز کردن جست‌وجوی سراسری (میانبر Ctrl + K)"
          >
            <Search className="ml-2 size-4" />
            اقدامات سریع
            <Kbd className="mr-2">⌘/Ctrl + K</Kbd>
          </Button>
          <span className="hidden xl:inline-flex text-xs text-muted-foreground">جست‌وجوی سراسری: <Kbd className="mx-1">⌘/Ctrl + K</Kbd></span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="اعلان‌ها"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && <span className="absolute top-1 left-1 size-2 bg-destructive rounded-full" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>{t.header.operationalInbox}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((item) => (
                <DropdownMenuItem key={item.title} asChild>
                  <Link href={item.href} className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    </div>
                    {item.unread && <Badge className="mt-1" variant="destructive">جدید</Badge>}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="ml-2 size-4" />
            خروج
          </Button>
        </div>
      </header>

      <CommandDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        title="اقدامات سریع"
        description="اقدام مورد نظر را جست‌وجو و اجرا کنید."
      >
        <CommandInput placeholder="جست‌وجوی عملیات..." />
        <CommandList>
          <CommandEmpty>نتیجه‌ای یافت نشد.</CommandEmpty>
          {recentActions.length > 0 && (
            <>
              <CommandGroup heading="اخیراً استفاده شده">
                {recentActions.map((item) => (
                  <CommandItem key={`recent-${item.label}`} onSelect={() => runQuickAction(item)}>
                    <item.icon className="size-4" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup heading="پرکاربردها">
            {favoriteActions.map((item) => (
              <CommandItem key={`favorite-${item.label}`} onSelect={() => runQuickAction(item)}>
                <item.icon className="size-4" />
                {item.label}
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="اقدامات این صفحه">
            {contextualActions.map((item) => (
              <CommandItem key={item.label} onSelect={() => runQuickAction(item)}>
                <item.icon className="size-4" />
                {item.label}
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
