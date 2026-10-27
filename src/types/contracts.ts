/**
 * Public HTTP contracts (PRD §6.6).
 *
 * These types are the seam between the web app and any future mobile client:
 * the API returns exactly these shapes, so an Expo app can be built later
 * without touching business logic.
 */

import type { JobStatus } from "@/lib/status";

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

export type JobEventDto = {
  id: string;
  status: JobStatus | null;
  publicNote: string | null;
  createdAt: string;
};

/** `POST /api/jobs` → 201 */
export type CreateJobResponse = {
  id: string;
  jobNumber: number;
  status: JobStatus;
  publicToken: string;
  publicUrl: string;
  createdAt: string;
};

/** One row in `GET /api/jobs`. */
export type JobListItem = {
  id: string;
  jobNumber: number;
  customerName: string;
  itemName: string;
  status: JobStatus;
  expectedReadyAt: string | null;
  updatedAt: string;
};

export type JobListCounts = {
  active: number;
  ready: number;
  delivered: number;
};

/** `GET /api/jobs` → 200 */
export type JobListResponse = {
  items: JobListItem[];
  counts: JobListCounts;
};

/** `GET /api/jobs/:id` and `PATCH /api/jobs/:id` → 200 (owner-only shape). */
export type OwnerJobResponse = {
  id: string;
  jobNumber: number;
  customerName: string;
  customerPhone: string;
  itemName: string;
  issue: string | null;
  status: JobStatus;
  estimateDays: number | null;
  expectedReadyAt: string | null;
  publicNote: string | null;
  internalNote: string | null;
  publicToken: string;
  publicUrl: string;
  statusChangedAt: string;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  events: JobEventDto[];
};

/** `GET /api/public/jobs/:token` → 200. Contains no customer PII. */
export type PublicJobResponse = {
  jobNumber: number;
  itemName: string;
  issue: string | null;
  status: JobStatus;
  expectedReadyAt: string | null;
  publicNote: string | null;
  statusChangedAt: string;
  updatedAt: string;
  timeline: { status: JobStatus | null; publicNote: string | null; at: string }[];
  shop: {
    name: string;
    address: string | null;
    timings: string | null;
    phone: string;
    whatsappPhone: string;
  };
};

/** `POST /api/public/lookup` → 200 (deliberately reduced shape). */
export type PublicLookupResponse = {
  items: {
    token: string;
    jobNumber: number;
    itemName: string;
    status: JobStatus;
    expectedReadyAt: string | null;
  }[];
};
