import {
  CircleCheck,
  CircleX,
  Clock,
  Inbox,
  PackageCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { copy } from "@/content/copy";
import { STATUS_THEME, type JobStatus, type StatusTheme } from "@/lib/status";

const ICONS: Record<StatusTheme["icon"], LucideIcon> = {
  inbox: Inbox,
  wrench: Wrench,
  clock: Clock,
  "check-circle": CircleCheck,
  "package-check": PackageCheck,
  "x-circle": CircleX,
};

/**
 * Status is always icon + text, never colour alone (PRD §5.5).
 */
export function StatusChip({
  status,
  size = "md",
  className,
}: {
  status: JobStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const theme = STATUS_THEME[status];
  const Icon = ICONS[theme.icon];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-small" : "px-2.5 py-1 text-small",
        theme.chipClassName,
        className,
      )}
    >
      <Icon aria-hidden="true" className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {copy.status[status].label}
    </span>
  );
}
