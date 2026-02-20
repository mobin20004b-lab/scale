import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

interface StatePanelProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyStatePanel({
  title,
  description,
  icon,
  action,
  className,
}: StatePanelProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? (
        <EmptyContent>
          <Button
            asChild={Boolean(action.href)}
            onClick={action.onClick}
            variant="outline"
          >
            {action.href ? (
              <a href={action.href}>{action.label}</a>
            ) : (
              <span>{action.label}</span>
            )}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

export function ErrorStatePanel(props: StatePanelProps) {
  return (
    <EmptyStatePanel
      {...props}
      className={`border border-destructive/40 bg-destructive/5 ${props.className ?? ""}`}
    />
  );
}

export function LoadingStatePanel() {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
