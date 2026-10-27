import * as React from "react";

import { cn } from "@/lib/cn";

/** 48px tall inputs with a visible border and focus ring (PRD §5.1, §5.5). */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-touch w-full rounded-card border border-line bg-background px-3 text-body text-ink placeholder:text-ink-muted disabled:bg-surface disabled:text-ink-muted",
          "aria-[invalid=true]:border-danger",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-card border border-line bg-background px-3 py-2 text-body text-ink placeholder:text-ink-muted disabled:bg-surface disabled:text-ink-muted",
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
});
