"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { copy } from "@/content/copy";
import { LIMITS } from "@/lib/config";
import type { JobPatchBody } from "@/hooks/use-job-update";
import type { OwnerJobResponse } from "@/types/contracts";

/**
 * Two notes, one control: the public note the customer sees in Roman Urdu, and
 * the private note that never leaves the shop (PRD F4).
 */
export function NoteEditors({
  job,
  pending,
  onPatch,
}: {
  job: OwnerJobResponse;
  pending: boolean;
  onPatch: (body: JobPatchBody, options?: { successMessage?: string }) => Promise<unknown>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <NoteEditor
        id="public-note"
        label={copy.jobDetail.publicNoteLabel}
        hint={copy.jobDetail.publicNoteHint}
        value={job.publicNote ?? ""}
        saveLabel={copy.jobDetail.publicNoteSave}
        pending={pending}
        onSave={(value) => onPatch({ publicNote: value.trim() === "" ? null : value.trim() })}
      />
      <NoteEditor
        id="internal-note"
        label={copy.jobDetail.internalNoteLabel}
        hint={copy.jobDetail.internalNoteHint}
        value={job.internalNote ?? ""}
        saveLabel={copy.jobDetail.internalNoteSave}
        pending={pending}
        onSave={(value) => onPatch({ internalNote: value.trim() === "" ? null : value.trim() })}
      />
    </div>
  );
}

function NoteEditor({
  id,
  label,
  hint,
  value,
  saveLabel,
  pending,
  onSave,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  saveLabel: string;
  pending: boolean;
  onSave: (value: string) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft !== value;

  return (
    <div className="flex flex-col gap-2">
      <Field id={id} label={label} hint={hint}>
        <Textarea
          id={id}
          rows={2}
          maxLength={LIMITS.publicNote}
          value={draft}
          aria-describedby={describedBy(id, hint)}
          onChange={(event) => setDraft(event.target.value)}
        />
      </Field>
      <div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={!dirty || pending}
          onClick={() => void onSave(draft)}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
