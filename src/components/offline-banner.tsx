"use client";

import { WifiOff } from "lucide-react";

import { copy } from "@/content/copy";
import { useOnline } from "@/hooks/use-online";

/** Honest, non-blocking offline notice; forms additionally disable themselves. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-status-waiting-for-part/30 bg-status-soft-waiting-for-part px-4 py-2 text-small font-medium text-status-waiting-for-part"
    >
      <WifiOff aria-hidden="true" className="h-4 w-4" />
      {copy.errors.offline}
    </div>
  );
}
