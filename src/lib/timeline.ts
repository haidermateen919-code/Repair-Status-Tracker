import { copy } from "@/content/copy";
import { formatHumanDate, formatTime, todayInShopTimezone } from "./dates";
import type { JobStatus } from "./status";

/**
 * Turns raw `JobEvent` rows into display-ready timeline entries. Keeping this
 * out of the components means the same rendering rules apply on the owner
 * screen and the public page, and it can be unit-tested.
 */

export type TimelineEntry = {
  status: JobStatus | null;
  publicNote: string | null;
  at: Date;
};

export type TimelineItem = {
  id: string;
  label: string;
  detail?: string;
  when: string;
  status: JobStatus | null;
};

export type TimelineAudience = "owner" | "customer";

export function buildTimelineItems(
  entries: TimelineEntry[],
  audience: TimelineAudience,
): TimelineItem[] {
  return entries.map((entry, index) => {
    const when = `${formatHumanDate(todayInShopTimezone(entry.at))} · ${formatTime(entry.at)}`;

    if (!entry.status) {
      return {
        id: `event-${index}`,
        label:
          audience === "owner" ? copy.jobDetail.timelineNoteUpdated : copy.publicStatus.noteUpdated,
        detail: entry.publicNote ?? undefined,
        when,
        status: null,
      };
    }

    return {
      id: `event-${index}`,
      label: copy.status[entry.status].label,
      detail: audience === "customer" ? copy.status[entry.status].customerMessage : undefined,
      when,
      status: entry.status,
    };
  });
}
