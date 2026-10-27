/**
 * The single source of truth for job statuses: the enum, the design tokens used
 * to render each one, and the transition rules.
 *
 * Pure module — no React, no database, no copy. Unit-tested.
 */

export const JOB_STATUSES = [
  "RECEIVED",
  "IN_REPAIR",
  "WAITING_FOR_PART",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/** Statuses that appear in the owner's "Active" tab. */
export const ACTIVE_STATUSES = ["RECEIVED", "IN_REPAIR", "WAITING_FOR_PART"] as const;

/** Statuses that end the job's life; leaving one is a deliberate "reopen". */
export const TERMINAL_STATUSES = ["DELIVERED", "CANCELLED"] as const;

/** Statuses offered as one-tap buttons on the job detail screen (Cancelled is in the overflow menu). */
export const PRIMARY_STATUSES = [
  "RECEIVED",
  "IN_REPAIR",
  "WAITING_FOR_PART",
  "READY",
  "DELIVERED",
] as const;

export type StatusTheme = {
  /** Lucide icon key; resolved to a component in `status-chip.tsx`. */
  icon: "inbox" | "wrench" | "clock" | "check-circle" | "package-check" | "x-circle";
  /** Tailwind classes. Static strings so the JIT compiler can see them. */
  chipClassName: string;
  panelClassName: string;
  dotClassName: string;
};

export const STATUS_THEME: Record<JobStatus, StatusTheme> = {
  RECEIVED: {
    icon: "inbox",
    chipClassName: "border-status-received/30 bg-status-soft-received text-status-received",
    panelClassName: "border-status-received/30 bg-status-soft-received text-status-received",
    dotClassName: "bg-status-received",
  },
  IN_REPAIR: {
    icon: "wrench",
    chipClassName: "border-status-in-repair/30 bg-status-soft-in-repair text-status-in-repair",
    panelClassName: "border-status-in-repair/30 bg-status-soft-in-repair text-status-in-repair",
    dotClassName: "bg-status-in-repair",
  },
  WAITING_FOR_PART: {
    icon: "clock",
    chipClassName:
      "border-status-waiting-for-part/30 bg-status-soft-waiting-for-part text-status-waiting-for-part",
    panelClassName:
      "border-status-waiting-for-part/30 bg-status-soft-waiting-for-part text-status-waiting-for-part",
    dotClassName: "bg-status-waiting-for-part",
  },
  READY: {
    icon: "check-circle",
    chipClassName: "border-status-ready/30 bg-status-soft-ready text-status-ready",
    panelClassName: "border-status-ready/30 bg-status-soft-ready text-status-ready",
    dotClassName: "bg-status-ready",
  },
  DELIVERED: {
    icon: "package-check",
    chipClassName: "border-status-delivered/30 bg-status-soft-delivered text-status-delivered",
    panelClassName: "border-status-delivered/30 bg-status-soft-delivered text-status-delivered",
    dotClassName: "bg-status-delivered",
  },
  CANCELLED: {
    icon: "x-circle",
    chipClassName: "border-status-cancelled/30 bg-status-soft-cancelled text-status-cancelled",
    panelClassName: "border-status-cancelled/30 bg-status-soft-cancelled text-status-cancelled",
    dotClassName: "bg-status-cancelled",
  },
};

const STATUS_SET = new Set<string>(JOB_STATUSES);

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function parseJobStatus(value: unknown): JobStatus | null {
  return isJobStatus(value) ? value : null;
}

export function isActiveStatus(status: JobStatus): boolean {
  return (ACTIVE_STATUSES as readonly JobStatus[]).includes(status);
}

export function isTerminalStatus(status: JobStatus): boolean {
  return (TERMINAL_STATUSES as readonly JobStatus[]).includes(status);
}

export function isPrimaryStatus(status: JobStatus): boolean {
  return (PRIMARY_STATUSES as readonly JobStatus[]).includes(status);
}

export type TransitionCheck =
  { allowed: true } | { allowed: false; reason: "REOPEN_REQUIRES_CONFIRMATION" };

/**
 * One function decides whether a status change is allowed (PRD §7.6 rule 30).
 *
 * Rules for v1:
 * - Any forward or backward move inside the workflow is allowed.
 * - Setting the same status is allowed (it is a no-op, not an event).
 * - Moving *out of* DELIVERED or CANCELLED re-opens the job, and therefore
 *   requires the caller to pass `confirmReopen`.
 */
export function canTransition(from: JobStatus, to: JobStatus): TransitionCheck {
  if (from === to) return { allowed: true };
  if (isTerminalStatus(from)) return { allowed: false, reason: "REOPEN_REQUIRES_CONFIRMATION" };
  return { allowed: true };
}

/** Ready jobs are sorted oldest-ready-first; this is the only status with a dedicated sort. */
export function isReady(status: JobStatus): boolean {
  return status === "READY";
}
