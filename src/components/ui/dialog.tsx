"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { cn } from "@/lib/cn";
import { Button } from "./button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/** Accessible modal: focus trap, Escape to close, labelled by its title. */
export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-background p-5 shadow-lg",
          className,
        )}
      >
        <DialogPrimitive.Title className="text-title text-ink">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-2 text-body text-ink-muted">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        <div className="mt-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export type ConfirmDialogCopy = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
};

/**
 * The only confirmation pattern in the app: destructive or irreversible
 * actions ask once, with the safe action first in the DOM order.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  copy,
  onConfirm,
  destructive = false,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ConfirmDialogCopy;
  onConfirm: () => void;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={copy.title} description={copy.description}>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="secondary" size="lg" disabled={busy}>
              {copy.cancelLabel}
            </Button>
          </DialogClose>
          <Button
            variant={destructive ? "danger" : "primary"}
            size="lg"
            onClick={onConfirm}
            disabled={busy}
          >
            {copy.confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
