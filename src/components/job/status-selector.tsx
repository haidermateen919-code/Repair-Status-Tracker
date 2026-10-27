"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { copy } from "@/content/copy";
import { canTransition, PRIMARY_STATUSES, STATUS_THEME, type JobStatus } from "@/lib/status";
import type { OwnerJobResponse } from "@/types/contracts";
import type { JobPatchBody } from "@/hooks/use-job-update";

/**
 * One-tap status control (PRD F4). Saving is optimistic and immediate; moving a
 * finished job back into the workflow asks for confirmation first.
 */
export function StatusSelector({
  job,
  pending,
  onPatch,
}: {
  job: OwnerJobResponse;
  pending: boolean;
  onPatch: (body: JobPatchBody, options?: { optimisticStatus?: JobStatus }) => Promise<unknown>;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ target: JobStatus; reopen: boolean } | null>(null);

  const isFinished = job.status === "DELIVERED" || job.status === "CANCELLED";

  function requestStatus(target: JobStatus) {
    if (target === job.status) return;

    const transition = canTransition(job.status, target);
    if (!transition.allowed) {
      setConfirm({ target, reopen: true });
      return;
    }

    void onPatch({ status: target }, { optimisticStatus: target });
  }

  async function confirmStatus() {
    if (!confirm) return;
    const { target, reopen } = confirm;
    setConfirm(null);
    setMoreOpen(false);
    await onPatch(
      { status: target, confirmReopen: reopen ? true : undefined },
      { optimisticStatus: target },
    );
  }

  return (
    <section aria-labelledby="status-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="status-heading" className="text-body font-semibold text-ink">
          {copy.jobDetail.statusLabel}
        </h2>
        <p className="text-small text-ink-muted">{copy.jobDetail.statusHint}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PRIMARY_STATUSES.map((status) => {
          const active = status === job.status;
          const theme = STATUS_THEME[status];
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => requestStatus(status)}
              className={cn(
                "flex min-h-touch flex-col items-start justify-center gap-0.5 rounded-card border px-3 py-2 text-left transition-colors",
                active
                  ? cn(theme.panelClassName, "border-2 font-semibold")
                  : "border-line bg-background text-ink hover:bg-surface",
                pending && "opacity-70",
              )}
            >
              <span className="text-body">{copy.status[status].label}</span>
              <span lang="ur-Latn" className="text-small text-ink-muted">
                {copy.status[status].ownerHelper}
              </span>
            </button>
          );
        })}

        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-full w-full justify-between"
            aria-expanded={moreOpen}
            aria-controls="status-extra-actions"
            onClick={() => setMoreOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setMoreOpen(false);
            }}
            disabled={pending}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <span>{copy.common.more}</span>
            )}
            <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
          </Button>

          {moreOpen ? (
            <div
              id="status-extra-actions"
              className="absolute right-0 top-full z-20 mt-1 w-56 rounded-card border border-line bg-background p-1 shadow-lg"
            >
              <button
                type="button"
                className="flex h-11 w-full items-center rounded-md px-3 text-left text-small font-medium text-danger hover:bg-danger-soft"
                onClick={() => {
                  setConfirm({ target: "CANCELLED", reopen: isFinished });
                }}
              >
                {copy.jobDetail.cancelJob}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        copy={{
          title: confirm?.reopen
            ? copy.jobDetail.reopenJobConfirmTitle
            : copy.jobDetail.cancelJobConfirmTitle,
          description: confirm?.reopen
            ? copy.jobDetail.reopenJobConfirmBody
            : copy.jobDetail.cancelJobConfirmBody,
          confirmLabel: confirm?.reopen
            ? copy.jobDetail.reopenJobConfirm
            : copy.jobDetail.cancelJobConfirm,
          cancelLabel: copy.common.cancel,
        }}
        destructive={!confirm?.reopen}
        busy={pending}
        onConfirm={() => void confirmStatus()}
      />
    </section>
  );
}
