"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { copy } from "@/content/copy";
import { ApiClientError, apiRequest } from "@/lib/client/api";
import type { JobStatus } from "@/lib/status";
import type { OwnerJobResponse } from "@/types/contracts";

export type JobPatchBody = {
  status?: JobStatus;
  expectedReadyAt?: string | null;
  estimateDays?: number | null;
  publicNote?: string | null;
  internalNote?: string | null;
  confirmReopen?: boolean;
};

type PatchOptions = {
  /** Applied immediately; rolled back if the request fails. */
  optimisticStatus?: JobStatus;
  successMessage?: string;
  /** Toast shown when the request fails (defaults to the status-save message). */
  failureMessage?: string;
};

/**
 * One place that knows how to persist a job change, including the optimistic
 * status flip and rollback required by PRD F4. Components stay presentational.
 */
export function useJobUpdate(initialJob: OwnerJobResponse) {
  const [job, setJob] = useState(initialJob);
  const [pending, setPending] = useState(false);

  const patch = useCallback(
    async (body: JobPatchBody, options: PatchOptions = {}): Promise<OwnerJobResponse | null> => {
      const previous = job;
      setPending(true);

      if (options.optimisticStatus) {
        setJob({ ...previous, status: options.optimisticStatus });
      }

      try {
        const updated = await apiRequest<OwnerJobResponse>(`/api/jobs/${previous.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setJob(updated);
        toast.success(options.successMessage ?? copy.common.saved);
        return updated;
      } catch (error) {
        setJob(previous);
        const message =
          error instanceof ApiClientError && error.status === 0
            ? copy.errors.offline
            : (options.failureMessage ?? copy.jobDetail.updateStatusError);
        toast.error(message);
        return null;
      } finally {
        setPending(false);
      }
    },
    [job],
  );

  return { job, setJob, patch, pending };
}
