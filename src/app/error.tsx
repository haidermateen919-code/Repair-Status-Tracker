"use client";

import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

/** Global error boundary: friendly copy, retry, and no stack traces on screen. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <EmptyState
        icon={AlertTriangle}
        title={copy.errors.genericTitle}
        body={copy.errors.genericBody}
        action={
          <Button type="button" size="lg" onClick={reset}>
            {copy.common.tryAgain}
          </Button>
        }
      />
    </main>
  );
}
