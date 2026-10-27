import { WifiOff } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { copy } from "@/content/copy";

export const metadata = {
  title: `${copy.errors.offline} — ${copy.app.name}`,
  robots: { index: false, follow: false },
};

/** Served by the service worker when a navigation request fails offline. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <EmptyState icon={WifiOff} title={copy.errors.offline} body={copy.errors.offlineBody} />
    </main>
  );
}
