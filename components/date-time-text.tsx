"use client";

import { useEffect, useState } from "react";
import {
  DateInput,
  formatPersianDateTime,
  formatPersianRelativeTime,
  getLocalTimeZoneLabel,
} from "@/lib/date-time"

interface DateTimeTextProps {
  value: DateInput
  mode?: "absolute" | "relative"
  showTimeZone?: boolean
  className?: string
}

export function DateTimeText({
  value,
  mode = "absolute",
  showTimeZone = false,
  className,
}: DateTimeTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = mode === "relative" ? formatPersianRelativeTime(value) : formatPersianDateTime(value)
  const timeZoneLabel = showTimeZone ? getLocalTimeZoneLabel(value) : null

  if (!mounted) {
    return <span className={className}>{mode === "relative" ? "..." : "---/--/--"}</span>;
  }

  return (
    <span className={className} title={timeZoneLabel ?? undefined}>
      {label}
      {timeZoneLabel ? ` (${timeZoneLabel})` : ""}
    </span>
  )
}
