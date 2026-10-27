"use client";

import { Loader2, SearchX } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { EmptyState } from "@/components/empty-state";
import { StatusChip } from "@/components/status-chip";
import { WhatsappShareButton } from "@/components/whatsapp-share-button";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/content/copy";
import { useOnline } from "@/hooks/use-online";
import { ApiClientError, apiRequest } from "@/lib/client/api";
import { describeExpectedReady, todayInShopTimezone } from "@/lib/dates";
import type { PublicLookupResponse } from "@/types/contracts";

type LookupState =
  | { kind: "idle" }
  | { kind: "results"; items: PublicLookupResponse["items"] }
  | { kind: "rate-limited" }
  | { kind: "error" };

/**
 * Customer lookup by phone. The response is deliberately thin (job number, item,
 * status, expected date) and every request is rate-limited server-side.
 */
export function TrackForm({ shopWhatsappPhone }: { shopWhatsappPhone: string | null }) {
  const online = useOnline();
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [state, setState] = useState<LookupState>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const today = todayInShopTimezone();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    if (phone.trim().length === 0) {
      setFieldError(copy.track.invalidPhone);
      return;
    }
    if (!online) {
      setState({ kind: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequest<PublicLookupResponse>("/api/public/lookup", {
        method: "POST",
        body: JSON.stringify({ phone, website }),
      });
      setState({ kind: "results", items: result.items });
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 429) {
          setState({ kind: "rate-limited" });
          return;
        }
        if (error.code === "VALIDATION_FAILED") {
          setFieldError(copy.track.invalidPhone);
          return;
        }
      }
      setState({ kind: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
        <Field id="lookup-phone" label={copy.track.phoneLabel} error={fieldError ?? undefined}>
          <Input
            id="lookup-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={describedBy("lookup-phone")}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={copy.track.phonePlaceholder}
          />
        </Field>

        {/* Honeypot: hidden from people, tempting to bots (PRD §7.4). */}
        <div aria-hidden="true" className="hidden">
          <label htmlFor="lookup-website">Website</label>
          <input
            id="lookup-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <Button type="submit" size="lg" disabled={submitting || !online} className="w-full">
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {copy.track.submitting}
            </>
          ) : (
            copy.track.submit
          )}
        </Button>
      </form>

      <p className="text-small text-ink-muted">{copy.track.privacyNote}</p>

      {state.kind === "rate-limited" ? (
        <EmptyState
          icon={SearchX}
          title={copy.track.rateLimitedTitle}
          body={copy.track.rateLimitedBody}
        />
      ) : null}

      {state.kind === "error" ? (
        <EmptyState icon={SearchX} title={copy.track.errorTitle} body={copy.track.errorBody} />
      ) : null}

      {state.kind === "results" && state.items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={copy.track.emptyTitle}
          body={copy.track.emptyBody}
          action={
            shopWhatsappPhone ? (
              <WhatsappShareButton
                phone={shopWhatsappPhone}
                message={`Assalam-o-alaikum, meri repair ka status poochna hai.`}
                label={copy.common.whatsapp}
                size="md"
              />
            ) : null
          }
        />
      ) : null}

      {state.kind === "results" && state.items.length > 0 ? (
        <section aria-live="polite" className="flex flex-col gap-3">
          <h2 className="text-body font-semibold text-ink">
            {copy.track.resultsTitle(state.items.length)}
          </h2>
          <ul className="flex flex-col gap-3">
            {state.items.map((item) => {
              const expected = item.expectedReadyAt
                ? describeExpectedReady(item.expectedReadyAt, today)
                : null;
              return (
                <li key={item.token}>
                  <Link
                    href={`/s/${item.token}`}
                    className="block rounded-card border border-line bg-background p-4 hover:border-accent"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-small text-ink-muted">
                          {copy.dashboard.jobNumber(item.jobNumber)}
                        </p>
                        <p className="truncate text-body font-semibold text-ink">{item.itemName}</p>
                      </div>
                      <StatusChip status={item.status} size="sm" />
                    </div>
                    {expected ? (
                      <p className="mt-2 text-small text-ink-muted">
                        {copy.dashboard.expectedPrefix} {expected.humanDate}
                      </p>
                    ) : null}
                    <p className="mt-2 text-small font-medium text-accent">{copy.track.open}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
