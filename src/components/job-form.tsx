"use client";

import { Loader2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { ZodError } from "zod";

import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { copy } from "@/content/copy";
import { useOnline } from "@/hooks/use-online";
import { ApiClientError, apiRequest } from "@/lib/client/api";
import { LIMITS } from "@/lib/config";
import { createJobSchema } from "@/lib/schemas/job";
import type { CreateJobResponse } from "@/types/contracts";

type FieldName =
  "customerName" | "customerPhone" | "itemName" | "issue" | "estimateDays" | "internalNote";
type FieldErrors = Partial<Record<FieldName, string>>;

/** Maps schema failures onto the shop owner's language, not developer text. */
function mapErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as FieldName | undefined;
    if (!field || errors[field]) continue;

    switch (field) {
      case "customerName":
        errors[field] =
          issue.code === "too_big"
            ? copy.newJob.validation.nameTooLong
            : copy.newJob.validation.nameRequired;
        break;
      case "customerPhone":
        errors[field] =
          issue.code === "too_small"
            ? copy.newJob.validation.phoneRequired
            : copy.newJob.validation.phoneInvalid;
        break;
      case "itemName":
        errors[field] =
          issue.code === "too_big"
            ? copy.newJob.validation.itemTooLong
            : copy.newJob.validation.itemRequired;
        break;
      case "issue":
        errors[field] = copy.newJob.validation.issueTooLong;
        break;
      case "internalNote":
        errors[field] = copy.newJob.validation.noteTooLong;
        break;
      case "estimateDays":
        errors[field] = copy.newJob.validation.estimateRange;
        break;
      default:
        break;
    }
  }

  return errors;
}

/**
 * Fast-entry form (PRD F3): only name, phone and item are required; everything
 * is reachable and submittable by keyboard, and the primary action is 48px.
 */
export function JobForm() {
  const router = useRouter();
  const online = useOnline();
  const nameId = useId();
  const phoneId = useId();
  const itemId = useId();
  const issueId = useId();
  const daysId = useId();
  const noteId = useId();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [itemName, setItemName] = useState("");
  const [issue, setIssue] = useState("");
  const [estimateDays, setEstimateDays] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function stepDays(delta: number) {
    const current = estimateDays.trim() === "" ? 0 : Number(estimateDays);
    const next = Math.min(LIMITS.estimateDaysMax, Math.max(0, current + delta));
    setEstimateDays(next === 0 ? "" : String(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const candidate = {
      customerName,
      customerPhone,
      itemName,
      issue,
      estimateDays: estimateDays.trim() === "" ? undefined : Number(estimateDays),
      internalNote,
    };

    const parsed = createJobSchema.safeParse(candidate);
    if (!parsed.success) {
      const mapped = mapErrors(parsed.error);
      setErrors(mapped);
      const firstField = (Object.keys(mapped) as FieldName[])[0];
      if (firstField) {
        document
          .getElementById(
            fieldDomId(firstField, { nameId, phoneId, itemId, issueId, daysId, noteId }),
          )
          ?.focus();
      }
      return;
    }

    setErrors({});

    if (!online) {
      setFormError(copy.errors.offline);
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiRequest<CreateJobResponse>("/api/jobs", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      router.push(`/app/jobs/${created.id}?created=1`);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiClientError && error.status === 0
          ? copy.errors.offline
          : copy.newJob.submitError,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <Field id={nameId} label={copy.newJob.customerNameLabel} error={errors.customerName}>
        <Input
          id={nameId}
          name="customerName"
          autoFocus
          autoComplete="off"
          required
          maxLength={LIMITS.customerName}
          value={customerName}
          aria-invalid={Boolean(errors.customerName)}
          aria-describedby={describedBy(nameId)}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder={copy.newJob.customerNamePlaceholder}
        />
      </Field>

      <Field
        id={phoneId}
        label={copy.newJob.customerPhoneLabel}
        hint={copy.newJob.customerPhoneHint}
        error={errors.customerPhone}
      >
        <Input
          id={phoneId}
          name="customerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          maxLength={LIMITS.customerPhone}
          value={customerPhone}
          aria-invalid={Boolean(errors.customerPhone)}
          aria-describedby={describedBy(phoneId, copy.newJob.customerPhoneHint)}
          onChange={(event) => setCustomerPhone(event.target.value)}
          placeholder={copy.newJob.customerPhonePlaceholder}
        />
      </Field>

      <Field id={itemId} label={copy.newJob.itemNameLabel} error={errors.itemName}>
        <Input
          id={itemId}
          name="itemName"
          autoComplete="off"
          required
          maxLength={LIMITS.itemName}
          value={itemName}
          aria-invalid={Boolean(errors.itemName)}
          aria-describedby={describedBy(itemId)}
          onChange={(event) => setItemName(event.target.value)}
          placeholder={copy.newJob.itemNamePlaceholder}
        />
      </Field>

      <div className="flex flex-wrap gap-2" aria-label={copy.newJob.itemChipsLabel}>
        {copy.newJob.itemChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setItemName(chip === "Other" ? "" : chip)}
            className="h-11 rounded-full border border-line bg-background px-4 text-small font-medium text-ink hover:bg-surface"
          >
            {chip}
          </button>
        ))}
      </div>

      <Field
        id={issueId}
        label={copy.newJob.issueLabel}
        optionalLabel={copy.common.optional}
        error={errors.issue}
      >
        <Textarea
          id={issueId}
          name="issue"
          rows={2}
          maxLength={LIMITS.issue}
          value={issue}
          aria-invalid={Boolean(errors.issue)}
          aria-describedby={describedBy(issueId)}
          onChange={(event) => setIssue(event.target.value)}
          placeholder={copy.newJob.issuePlaceholder}
        />
      </Field>

      <Field
        id={daysId}
        label={copy.newJob.estimateDaysLabel}
        hint={copy.newJob.estimateDaysHint}
        optionalLabel={copy.common.optional}
        error={errors.estimateDays}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Minus one day"
            onClick={() => stepDays(-1)}
          >
            <Minus aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Input
            id={daysId}
            name="estimateDays"
            type="number"
            inputMode="numeric"
            min={LIMITS.estimateDaysMin}
            max={LIMITS.estimateDaysMax}
            value={estimateDays}
            aria-invalid={Boolean(errors.estimateDays)}
            aria-describedby={describedBy(daysId, copy.newJob.estimateDaysHint)}
            onChange={(event) => setEstimateDays(event.target.value)}
            className="w-24 text-center"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Plus one day"
            onClick={() => stepDays(1)}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </Button>
          <span className="text-small text-ink-muted">{copy.newJob.estimateDaysHint}</span>
        </div>
      </Field>

      <Field
        id={noteId}
        label={copy.newJob.internalNoteLabel}
        hint={copy.newJob.internalNoteHint}
        optionalLabel={copy.common.optional}
        error={errors.internalNote}
      >
        <Textarea
          id={noteId}
          name="internalNote"
          rows={2}
          maxLength={LIMITS.internalNote}
          value={internalNote}
          aria-invalid={Boolean(errors.internalNote)}
          aria-describedby={describedBy(noteId, copy.newJob.internalNoteHint)}
          onChange={(event) => setInternalNote(event.target.value)}
        />
      </Field>

      <p aria-live="polite" className="min-h-[1.25rem] text-small text-danger">
        {formError ?? ""}
      </p>

      <Button type="submit" size="lg" disabled={submitting || !online} className="w-full">
        {submitting ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            {copy.newJob.submitting}
          </>
        ) : (
          copy.newJob.submit
        )}
      </Button>
    </form>
  );
}

function fieldDomId(
  field: FieldName,
  ids: {
    nameId: string;
    phoneId: string;
    itemId: string;
    issueId: string;
    daysId: string;
    noteId: string;
  },
): string {
  switch (field) {
    case "customerName":
      return ids.nameId;
    case "customerPhone":
      return ids.phoneId;
    case "itemName":
      return ids.itemId;
    case "issue":
      return ids.issueId;
    case "estimateDays":
      return ids.daysId;
    case "internalNote":
      return ids.noteId;
  }
}
