import { z } from "zod";

import { LIMITS } from "../config";
import { JOB_STATUSES } from "../status";
import { isoDateSchema, nullableText, optionalInt, phoneInputSchema, rowIdSchema } from "./common";

/** `POST /api/jobs` */
export const createJobSchema = z.strictObject({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(LIMITS.customerName, `Must be ${LIMITS.customerName} characters or fewer`),
  customerPhone: phoneInputSchema,
  itemName: z
    .string()
    .trim()
    .min(1, "Item is required")
    .max(LIMITS.itemName, `Must be ${LIMITS.itemName} characters or fewer`),
  issue: nullableText(LIMITS.issue),
  estimateDays: optionalInt(LIMITS.estimateDaysMin, LIMITS.estimateDaysMax),
  expectedReadyAt: isoDateSchema.nullable().optional(),
  internalNote: nullableText(LIMITS.internalNote),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

/**
 * `PATCH /api/jobs/:id` — any subset. `confirmReopen` is the deliberate
 * acknowledgement required to move a finished job back into the workflow.
 */
export const updateJobSchema = z
  .strictObject({
    status: z.enum(JOB_STATUSES).optional(),
    expectedReadyAt: isoDateSchema.nullable().optional(),
    estimateDays: z
      .number()
      .int()
      .min(LIMITS.estimateDaysMin)
      .max(LIMITS.estimateDaysMax)
      .nullable()
      .optional(),
    publicNote: nullableText(LIMITS.publicNote),
    internalNote: nullableText(LIMITS.internalNote),
    confirmReopen: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.expectedReadyAt !== undefined ||
      value.estimateDays !== undefined ||
      value.publicNote !== undefined ||
      value.internalNote !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export const JOB_LIST_FILTERS = ["active", "ready", "delivered", "all"] as const;
export type JobListFilter = (typeof JOB_LIST_FILTERS)[number];

/** `GET /api/jobs` query string. */
export const listJobsQuerySchema = z.strictObject({
  status: z.enum(JOB_LIST_FILTERS).default("active"),
  q: z.string().trim().max(LIMITS.searchQuery).optional(),
});

export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;

/** Route parameter for `/api/jobs/:id`. */
export const jobIdParamSchema = z.strictObject({ id: rowIdSchema });
