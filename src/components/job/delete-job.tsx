"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { copy } from "@/content/copy";
import { ApiClientError, apiRequest } from "@/lib/client/api";
import type { OwnerJobResponse } from "@/types/contracts";

/**
 * Soft delete with one confirmation. The public link stops working immediately,
 * which is why this lives in a visually separate "danger" area.
 */
export function DeleteJob({ job }: { job: OwnerJobResponse }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await apiRequest<{ ok: boolean }>(`/api/jobs/${job.id}`, { method: "DELETE" });
      toast.success(copy.common.saved);
      router.push("/app");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError && error.status === 0
          ? copy.errors.offline
          : copy.jobDetail.deleteJobError,
      );
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <section aria-labelledby="danger-heading" className="flex flex-col gap-3 rounded-card border border-danger/30 p-4">
      <h2 id="danger-heading" className="text-small font-semibold uppercase tracking-wide text-danger">
        {copy.jobDetail.dangerZone}
      </h2>
      <Button type="button" variant="danger" size="md" onClick={() => setOpen(true)} disabled={busy}>
        <Trash2 aria-hidden="true" className="h-4 w-4" />
        {copy.jobDetail.deleteJob}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        copy={{
          title: copy.jobDetail.deleteJobConfirmTitle,
          description: copy.jobDetail.deleteJobConfirmBody,
          confirmLabel: copy.jobDetail.deleteJobConfirm,
          cancelLabel: copy.common.cancel,
        }}
        destructive
        busy={busy}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
