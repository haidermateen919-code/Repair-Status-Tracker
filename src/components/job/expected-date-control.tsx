"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/content/copy";
import { expectedDateFromDays } from "@/lib/dates";
import { LIMITS } from "@/lib/config";
import type { JobPatchBody } from "@/hooks/use-job-update";
import type { OwnerJobResponse } from "@/types/contracts";

/**
 * Expected-ready date: a date input plus the owner-friendly "days from today"
 * stepper, both saving immediately (PRD F4).
 */
export function ExpectedDateControl({
  job,
  today,
  pending,
  onPatch,
}: {
  job: OwnerJobResponse;
  today: string;
  pending: boolean;
  onPatch: (body: JobPatchBody) => Promise<unknown>;
}) {
  const [days, setDays] = useState<string>(job.estimateDays ? String(job.estimateDays) : "");
  const [dateValue, setDateValue] = useState<string>(job.expectedReadyAt ?? "");

  const preview =
    days.trim() !== "" && Number(days) >= LIMITS.estimateDaysMin
      ? expectedDateFromDays(Number(days), today)
      : null;

  return (
    <section aria-labelledby="expected-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="expected-heading" className="text-body font-semibold text-ink">
          {copy.jobDetail.expectedReadyLabel}
        </h2>
        <p className="text-small text-ink-muted">{copy.jobDetail.expectedReadyHint}</p>
      </div>

      <Field id="expected-date" label={copy.jobDetail.dateLabel}>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="expected-date"
            type="date"
            value={dateValue}
            aria-describedby={describedBy("expected-date")}
            className="w-auto"
            onChange={(event) => {
              const value = event.target.value;
              setDateValue(value);
              void onPatch({ expectedReadyAt: value === "" ? null : value });
            }}
          />
          {dateValue ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setDateValue("");
                setDays("");
                void onPatch({ expectedReadyAt: null, estimateDays: null });
              }}
            >
              {copy.jobDetail.clearDate}
            </Button>
          ) : null}
        </div>
      </Field>

      <Field
        id="expected-days"
        label={copy.jobDetail.daysStepperLabel}
        hint={copy.newJob.estimateDaysHint}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="expected-days"
            type="number"
            inputMode="numeric"
            min={LIMITS.estimateDaysMin}
            max={LIMITS.estimateDaysMax}
            value={days}
            aria-describedby={describedBy("expected-days", copy.newJob.estimateDaysHint)}
            className="w-24 text-center"
            onChange={(event) => setDays(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={pending || days.trim() === ""}
            onClick={() => {
              const value = Number(days);
              if (
                !Number.isInteger(value) ||
                value < LIMITS.estimateDaysMin ||
                value > LIMITS.estimateDaysMax
              ) {
                return;
              }
              const nextDate = expectedDateFromDays(value, today);
              setDateValue(nextDate);
              void onPatch({ estimateDays: value });
            }}
          >
            {copy.jobDetail.daysStepperApply}
          </Button>
          {preview ? <span className="text-small text-ink-muted">{preview}</span> : null}
        </div>
      </Field>
    </section>
  );
}
