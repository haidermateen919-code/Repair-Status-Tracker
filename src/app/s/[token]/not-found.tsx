import { LinkIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

export const metadata = {
  title: `${copy.publicStatus.invalidTitle} — ${copy.app.name}`,
  robots: { index: false, follow: false },
};

/**
 * One page for unknown, deleted and malformed links, so the response never
 * reveals whether a token ever existed (PRD §7.3).
 */
export default function InvalidLinkPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <EmptyState
        icon={LinkIcon}
        title={copy.publicStatus.invalidTitle}
        body={copy.publicStatus.invalidBody}
        action={
          <Button asChild size="lg">
            <Link href="/track">{copy.publicStatus.invalidCta}</Link>
          </Button>
        }
      />
    </main>
  );
}
