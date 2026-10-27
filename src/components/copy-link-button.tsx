"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { copy } from "@/content/copy";

/** Copy-with-toast, used on the job detail screen as the no-WhatsApp fallback. */
export function CopyLinkButton({
  value,
  label,
  variant = "secondary",
  size = "md",
}: {
  value: string;
  label: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(copy.common.copied);
    } catch {
      toast.error(copy.common.copyFailed);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={handleCopy}>
      <Copy aria-hidden="true" className="h-4 w-4" />
      {label}
    </Button>
  );
}
