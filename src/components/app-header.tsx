import { LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { signOut } from "@/lib/auth";

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

        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/app/jobs/new">{copy.nav.newJob}</Link>
          </Button>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm" aria-label={copy.nav.logout}>
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{copy.nav.logout}</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
