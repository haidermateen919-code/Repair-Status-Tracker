import { CopyLinkButton } from "@/components/copy-link-button";
import { WhatsappShareButton } from "@/components/whatsapp-share-button";
import { copy } from "@/content/copy";
import { buildShareMessages } from "@/lib/share";
import type { OwnerJobResponse } from "@/types/contracts";

export type ShareShopInfo = { name: string; phone: string };

/**
 * The customer's link and the two WhatsApp messages (PRD F4, §6.6). The link
 * never changes when the status changes — that is the whole product promise.
 */
export function SharePanel({ job, shop }: { job: OwnerJobResponse; shop: ShareShopInfo }) {
  const { newJobMessage, updateMessage } = buildShareMessages(job, shop);

  return (
    <section aria-labelledby="share-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="share-heading" className="text-body font-semibold text-ink">
          {copy.jobDetail.shareTitle}
        </h2>
        <p className="text-small text-ink-muted">{copy.jobDetail.shareHint}</p>
      </div>

      <p className="break-all rounded-card border border-line bg-surface px-3 py-2 text-small text-ink">
        {job.publicUrl}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <WhatsappShareButton
          phone={job.customerPhone}
          message={newJobMessage}
          label={copy.jobDetail.shareWhatsApp}
          className="w-full sm:w-auto"
        />
        <CopyLinkButton value={job.publicUrl} label={copy.common.copy} size="lg" />
      </div>

      <WhatsappShareButton
        phone={job.customerPhone}
        message={updateMessage}
        label={copy.jobDetail.shareUpdate}
        variant="secondary"
        size="md"
      />
    </section>
  );
}
