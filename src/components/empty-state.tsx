import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

/** Shared empty/error illustration block used by every list and failure page. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-muted">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="text-body font-semibold text-ink">{title}</h2>
      {body ? <p className="max-w-xs text-small text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
