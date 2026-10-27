"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

/**
 * Clears the session server-side (the same `/api/auth/signout` endpoint the
 * end-to-end tests exercise) and returns the owner to the login screen.
 */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={copy.nav.logout}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await signOut({ redirect: false });
          router.replace("/login");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only">{copy.nav.logout}</span>
    </Button>
  );
}
