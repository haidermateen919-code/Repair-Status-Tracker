import * as React from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Label + control + hint/error, wired for accessibility: a real `<label>`,
 * `aria-describedby` for hints and errors, and an `aria-live` error region so
 * screen readers announce validation problems (PRD §5.5).
 */
export function Field({ id, label, hint, error, optionalLabel, className, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-small font-medium"
      >
        <span>{label}</span>
        {optionalLabel ? <span className="text-ink-muted">{optionalLabel}</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={hintId} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      <p id={errorId} aria-live="polite" className="min-h-[1.25rem] text-small text-danger">
        {error ?? ""}
      </p>
    </div>
  );
}

/** `aria-describedby` value for a control rendered inside `<Field>`. */
export function describedBy(id: string, hint?: string): string {
  return hint ? `${id}-hint ${id}-error` : `${id}-error`;
}
