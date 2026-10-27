import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

/** Owner-area header: shop identity, primary navigation and logout. */
export function AppHeader({ shopName, email }: { shopName: string; email: string }) {
  return (
    <header className="border-b border-line bg-background">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-ink">{shopName}</p>
          <p className="truncate text-small text-ink-muted">
            {copy.nav.loggedInAs} {email}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/app/jobs/new">{copy.nav.newJob}</Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
