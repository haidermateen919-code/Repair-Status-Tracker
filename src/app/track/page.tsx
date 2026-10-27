import type { Metadata } from "next";
import Link from "next/link";

import { TrackForm } from "@/components/track-form";
import { copy } from "@/content/copy";
import { getPrimaryShop } from "@/lib/services/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${copy.track.title} — ${copy.app.name}`,
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Phone-number fallback (PRD F5b). Exists because the shop hands out no paper
 * receipt, so losing the link must not lose the repair.
 */
export default async function TrackPage() {
  const shop = await getPrimaryShop();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-8">
      <div>
        <h1 className="text-title text-ink">{copy.track.title}</h1>
        <p className="mt-1 text-body text-ink-muted">{copy.track.subtitle}</p>
      </div>

      <TrackForm shopWhatsappPhone={shop?.whatsappPhone ?? null} />

      <p className="mt-auto text-center text-small text-ink-muted">
        <Link href="/login" className="underline-offset-4 hover:underline">
          {copy.track.ownerLogin}
        </Link>
      </p>
    </main>
  );
}
