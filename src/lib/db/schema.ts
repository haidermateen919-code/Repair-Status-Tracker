/**
 * Database schema (PRD §6.4). One shop, one owner, many jobs, append-only events.
 *
 * This file is the single description of the Postgres shape; the SQL in
 * `drizzle/0000_init.sql` mirrors it and is applied by `npm run db:migrate`.
 */

import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createId } from "@/lib/ids";

export const jobStatusEnum = pgEnum("job_status", [
  "RECEIVED",
  "IN_REPAIR",
  "WAITING_FOR_PART",
  "READY",
  "DELIVERED",
  "CANCELLED",
]);

const createdAt = timestamp("created_at", { withTimezone: true, mode: "date" })
  .notNull()
  .defaultNow();

export const shops = pgTable("shops", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  address: text("address"),
  timings: text("timings"),
  phone: text("phone").notNull(),
  whatsappPhone: text("whatsapp_phone").notNull(),
  logoUrl: text("logo_url"),
  /** Last job number handed out; start at 1000 so #1001 is the first job. */
  jobSeq: integer("job_seq").notNull().default(1000),
  createdAt,
});

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    /** Reserved for future staff accounts; v1 only ever writes "owner". */
    role: text("role").notNull().default("owner"),
    createdAt,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_shop_idx").on(table.shopId),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    jobNumber: integer("job_number").notNull(),
    /** 256-bit bearer capability; the customer's only key. */
    publicToken: text("public_token").notNull(),
    customerName: text("customer_name").notNull(),
    /** Always normalised E.164 (PRD §6.5). */
    customerPhone: text("customer_phone").notNull(),
    itemName: text("item_name").notNull(),
    issue: text("issue"),
    status: jobStatusEnum("status").notNull().default("RECEIVED"),
    estimateDays: integer("estimate_days"),
    /** Date-only value, stored as `date` so it never drifts across timezones. */
    expectedReadyAt: date("expected_ready_at", { mode: "string" }),
    publicNote: text("public_note"),
    internalNote: text("internal_note"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("jobs_shop_number_unique").on(table.shopId, table.jobNumber),
    uniqueIndex("jobs_public_token_unique").on(table.publicToken),
    index("jobs_shop_status_created_idx").on(table.shopId, table.status, table.createdAt),
    index("jobs_shop_created_idx").on(table.shopId, table.createdAt),
    index("jobs_shop_phone_created_idx").on(table.shopId, table.customerPhone, table.createdAt),
  ],
);

export const jobEvents = pgTable(
  "job_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    /** Set when the event is a status change. */
    status: jobStatusEnum("status"),
    /** Set when the event is a public-note change. Never contains internal notes. */
    publicNote: text("public_note"),
    createdAt,
  },
  (table) => [index("job_events_job_created_idx").on(table.jobId, table.createdAt)],
);

/**
 * Postgres-backed sliding-window rate limiter (PRD §6.2 allows this instead of
 * Upstash). Rows are pruned by the limiter itself and by `npm run db:purge`.
 */
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bucket: text("bucket").notNull(),
    createdAt,
  },
  (table) => [index("rate_limit_bucket_created_idx").on(table.bucket, table.createdAt)],
);

export const shopsRelations = relations(shops, ({ many }) => ({
  users: many(users),
  jobs: many(jobs),
}));

export const usersRelations = relations(users, ({ one }) => ({
  shop: one(shops, { fields: [users.shopId], references: [shops.id] }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  shop: one(shops, { fields: [jobs.shopId], references: [shops.id] }),
  events: many(jobEvents),
}));

export const jobEventsRelations = relations(jobEvents, ({ one }) => ({
  job: one(jobs, { fields: [jobEvents.jobId], references: [jobs.id] }),
}));

/** Raw NOT NULL default helper used by the seed/migration checks. */
export const nowSql = sql`now()`;

export type ShopRow = typeof shops.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type JobEventRow = typeof jobEvents.$inferSelect;
