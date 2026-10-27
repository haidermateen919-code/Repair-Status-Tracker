"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { copy } from "@/content/copy";
import type { JobListFilter } from "@/lib/schemas/job";
import type { JobListCounts } from "@/types/contracts";

const TABS: { id: JobListFilter; label: string; countKey?: keyof JobListCounts }[] = [
  { id: "active", label: copy.dashboard.tabs.active, countKey: "active" },
  { id: "ready", label: copy.dashboard.tabs.ready, countKey: "ready" },
  { id: "delivered", label: copy.dashboard.tabs.delivered, countKey: "delivered" },
  { id: "all", label: copy.dashboard.tabs.all },
];

/** Filter tabs + debounced search. State lives in the URL so it survives reloads. */
export function SearchFilters({
  filter,
  query,
  counts,
}: {
  filter: JobListFilter;
  query: string;
  counts: JobListCounts;
}) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const lastPushed = useRef(query);

  useEffect(() => {
    setValue(query);
    lastPushed.current = query;
  }, [query]);

  useEffect(() => {
    if (value === lastPushed.current) return;

    const timer = setTimeout(() => {
      lastPushed.current = value;
      const params = new URLSearchParams();
      if (filter !== "active") params.set("status", filter);
      if (value.trim()) params.set("q", value.trim());
      const qs = params.toString();
      router.replace(qs ? `/app?${qs}` : "/app", { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, filter, router]);

  function tabHref(tab: JobListFilter): string {
    const params = new URLSearchParams();
    if (tab !== "active") params.set("status", tab);
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    return qs ? `/app?${qs}` : "/app";
  }

  return (
    <div className="flex flex-col gap-3">
      <nav className="flex flex-wrap gap-2" aria-label={copy.dashboard.title}>
        {TABS.map((tab) => {
          const active = tab.id === filter;
          return (
            <Link
              key={tab.id}
              href={tabHref(tab.id)}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-small font-medium transition-colors",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-line bg-background text-ink hover:bg-surface",
              )}
            >
              {tab.label}
              {tab.countKey ? (
                <span className={cn("text-small", active ? "text-white/80" : "text-ink-muted")}>
                  {counts[tab.countKey]}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={copy.dashboard.searchPlaceholder}
          aria-label={copy.dashboard.searchLabel}
          className="h-touch w-full rounded-card border border-line bg-background pl-9 pr-10 text-body text-ink placeholder:text-ink-muted"
        />
        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label={copy.dashboard.searchClear}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-surface"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
