"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type UserOption = {
  id: string
  full_name: string
}

type QuickRange = {
  from: string
  to: string
}

type ActivityFiltersProps = {
  users: UserOption[]
  initialEntity: string
  initialUser: string
  initialFrom: string
  initialTo: string
  quickRanges: {
    today: QuickRange
    week: QuickRange
    month: QuickRange
  }
}

export function ActivityFilters({
  users,
  initialEntity,
  initialUser,
  initialFrom,
  initialTo,
  quickRanges,
}: ActivityFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [entity, setEntity] = useState(initialEntity)
  const [user, setUser] = useState(initialUser)
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)

  const selectedUserLabel = useMemo(
    () => users.find((item) => item.id === user)?.full_name,
    [users, user],
  )

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (entity !== "all") params.set("entity", entity)
    else params.delete("entity")

    if (user !== "all") params.set("user", user)
    else params.delete("user")

    if (from) params.set("from", from)
    else params.delete("from")

    if (to) params.set("to", to)
    else params.delete("to")

    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    setEntity("all")
    setUser("all")
    setFrom("")
    setTo("")
    router.push(pathname)
  }

  const applyRange = (range: QuickRange) => {
    setFrom(range.from)
    setTo(range.to)
  }

  const hasActiveFilters = entity !== "all" || user !== "all" || from || to

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-2">
          <Label>موجودیت</Label>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger>
              <SelectValue placeholder="همه موجودیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه موجودیت‌ها</SelectItem>
              <SelectItem value="Product">محصول</SelectItem>
              <SelectItem value="StockIn">ورود</SelectItem>
              <SelectItem value="StockOut">خروج</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>کاربر</Label>
          <Select value={user} onValueChange={setUser}>
            <SelectTrigger>
              <SelectValue placeholder="همه کاربران" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه کاربران</SelectItem>
              {users.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="from">از تاریخ</Label>
          <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="to">تا تاریخ</Label>
          <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => applyRange(quickRanges.today)}>
          امروز
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyRange(quickRanges.week)}>
          ۷ روز اخیر
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyRange(quickRanges.month)}>
          این ماه
        </Button>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={applyFilters}>اعمال فیلتر</Button>
        <Button type="button" variant="outline" onClick={clearFilters}>پاک کردن</Button>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Badge variant="secondary">فیلترهای فعال</Badge>
          {entity !== "all" && <Badge variant="outline">موجودیت: {entity}</Badge>}
          {user !== "all" && selectedUserLabel && (
            <Badge variant="outline">کاربر: {selectedUserLabel}</Badge>
          )}
          {from && <Badge variant="outline">از: {from}</Badge>}
          {to && <Badge variant="outline">تا: {to}</Badge>}
        </div>
      )}
    </div>
  )
}
