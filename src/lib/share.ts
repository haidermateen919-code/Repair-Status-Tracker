import { copy } from "@/content/copy";
import type { JobStatus } from "./status";

/**
 * The two WhatsApp messages, built from one place so the sticky mobile action
 * and the share panel can never drift apart (PRD §6.6). Pure and unit-tested.
 */
export type ShareableJob = {
  customerName: string;
  itemName: string;
  jobNumber: number;
  publicUrl: string;
  status: JobStatus;
};

export type ShareableShop = {
  name: string;
  phone: string;
};

export type ShareMessages = {
  /** Message that introduces the link, sent once when the job is created. */
  newJobMessage: string;
  /** Message that nudges the customer about the same link. */
  updateMessage: string;
};

export function buildShareMessages(job: ShareableJob, shop: ShareableShop): ShareMessages {
  return {
    newJobMessage: copy.whatsapp.newJobMessage({
      customerName: job.customerName,
      itemName: job.itemName,
      jobNumber: job.jobNumber,
      publicUrl: job.publicUrl,
      shopName: shop.name,
      shopPhone: shop.phone,
    }),
    updateMessage: copy.whatsapp.updateMessage({
      customerName: job.customerName,
      itemName: job.itemName,
      jobNumber: job.jobNumber,
      statusLabel: copy.status[job.status].label,
      publicUrl: job.publicUrl,
    }),
  };
}
