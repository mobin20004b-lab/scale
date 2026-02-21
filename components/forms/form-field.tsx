"use client";

import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  success?: boolean;
  children: ReactNode;
  hintId?: string;
  errorId?: string;
}

export function FormField({
  id,
  label,
  required,
  helperText,
  error,
  success,
  children,
  hintId,
  errorId,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
      {helperText ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!error && success ? (
        <p className={cn("flex items-center gap-1 text-xs text-emerald-600")}>
          <CheckCircle2 className="size-3.5" />
          معتبر است
        </p>
      ) : null}
    </div>
  );
}
