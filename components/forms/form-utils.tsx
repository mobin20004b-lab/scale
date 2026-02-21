"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Circle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "failed";

export function SaveStatusInline({
  state,
  className,
  action,
}: {
  state: SaveState;
  className?: string;
  action?: React.ReactNode;
}) {
  const config = {
    idle: { label: "Idle", icon: Circle },
    saving: { label: "Saving...", icon: Loader2 },
    saved: { label: "Saved", icon: CheckCircle2 },
    failed: { label: "Failed", icon: AlertCircle },
  }[state];

  const Icon = config.icon;

  return (
    <div
      className={cn("flex items-center justify-between gap-2", className)}
      role="status"
      aria-live="polite"
    >
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon
          className={cn("size-3.5", state === "saving" && "animate-spin")}
        />
        <span>{config.label}</span>
      </p>
      {action}
    </div>
  );
}

export function FormErrorSummary({
  errors,
  title = "لطفاً خطاهای فرم را برطرف کنید",
}: {
  errors: string[];
  title?: string;
}) {
  if (!errors.length) return null;

  return (
    <Alert variant="destructive" tabIndex={-1} id="form-error-summary">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-disc space-y-1 pr-5">
          {errors.map((error, index) => (
            <li key={`${error}-${index}`}>{error}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export function useFieldA11y(error?: string, helperText?: string) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return {
    inputId,
    hintId,
    errorId,
    describedBy: [helperText ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" "),
  };
}

export function useUnsavedChangesGuard(enabled: boolean) {
  const [isConfirmingNavigation, setIsConfirmingNavigation] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);

  const confirmNavigation = () => {
    if (!enabled) return true;
    setIsConfirmingNavigation(true);
    const confirmed = window.confirm(
      "تغییرات ذخیره نشده دارید. آیا از صفحه خارج شوید؟"
    );
    setIsConfirmingNavigation(false);
    return confirmed;
  };

  return useMemo(
    () => ({ confirmNavigation, isConfirmingNavigation }),
    [isConfirmingNavigation]
  );
}

export function focusFirstInvalidField(form: HTMLFormElement | null) {
  if (!form) return;
  const invalid = form.querySelector<HTMLElement>(
    "[aria-invalid='true'], [data-invalid='true'], .border-destructive"
  );
  invalid?.focus();
}

export function handleFormKeyboardNavigation(
  event: React.KeyboardEvent<HTMLFormElement>,
  barcodeFocusTarget?: string
) {
  const form = event.currentTarget;
  const target = event.target as HTMLElement;

  if (event.altKey && event.key.toLowerCase() === "b" && barcodeFocusTarget) {
    event.preventDefault();
    form.querySelector<HTMLElement>(barcodeFocusTarget)?.focus();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    form.requestSubmit();
    return;
  }

  if (event.key !== "Enter" || target.tagName === "TEXTAREA") return;

  const focusable = Array.from(
    form.querySelectorAll<HTMLElement>(
      "input:not([type='hidden']), button, select, textarea, [role='combobox']"
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

  const currentIndex = focusable.indexOf(target);
  if (currentIndex === -1) return;

  const next = focusable[currentIndex + 1];
  if (!next) return;

  event.preventDefault();
  next.focus();
}
