import { cn } from "@/lib/cn";
import { STATUS_THEME } from "@/lib/status";
import type { TimelineItem } from "@/lib/timeline";

/** Presentational timeline; the entries are prepared by `buildTimelineItems`. */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative flex flex-col gap-4 border-l border-line pl-4", className)}>
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background",
              item.status ? STATUS_THEME[item.status].dotClassName : "bg-ink-muted",
            )}
          />
          <p className="text-body font-medium text-ink">{item.label}</p>
          {item.detail ? (
            <p lang="ur-Latn" className="text-small text-ink-muted">
              {item.detail}
            </p>
          ) : null}
          <p className="text-small text-ink-muted">{item.when}</p>
        </li>
      ))}
    </ol>
  );
}
