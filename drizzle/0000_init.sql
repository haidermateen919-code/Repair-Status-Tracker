-- Repair Status Tracker — initial schema (PRD §6.4).
-- Applied by `npm run db:migrate`. Written to be idempotent so a partially
-- applied migration can always be re-run safely.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM (
      'RECEIVED',
      'IN_REPAIR',
      'WAITING_FOR_PART',
      'READY',
      'DELIVERED',
      'CANCELLED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS shops (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  address        text,
  timings        text,
  phone          text NOT NULL,
  whatsapp_phone text NOT NULL,
  logo_url       text,
  job_seq        integer NOT NULL DEFAULT 1000,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  shop_id       text NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  email         text NOT NULL,
  password_hash text NOT NULL,
  name          text,
  role          text NOT NULL DEFAULT 'owner',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
CREATE INDEX IF NOT EXISTS users_shop_idx ON users (shop_id);

CREATE TABLE IF NOT EXISTS jobs (
  id                text PRIMARY KEY,
  shop_id           text NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  job_number        integer NOT NULL,
  public_token      text NOT NULL,
  customer_name     text NOT NULL,
  customer_phone    text NOT NULL,
  item_name         text NOT NULL,
  issue             text,
  status            job_status NOT NULL DEFAULT 'RECEIVED',
  estimate_days     integer,
  expected_ready_at date,
  public_note       text,
  internal_note     text,
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  delivered_at      timestamptz,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_shop_number_unique ON jobs (shop_id, job_number);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_public_token_unique ON jobs (public_token);
CREATE INDEX IF NOT EXISTS jobs_shop_status_created_idx ON jobs (shop_id, status, created_at);
CREATE INDEX IF NOT EXISTS jobs_shop_created_idx ON jobs (shop_id, created_at);
CREATE INDEX IF NOT EXISTS jobs_shop_phone_created_idx ON jobs (shop_id, customer_phone, created_at);

CREATE TABLE IF NOT EXISTS job_events (
  id          text PRIMARY KEY,
  job_id      text NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  status      job_status,
  public_note text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_events_job_created_idx ON job_events (job_id, created_at);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id         bigserial PRIMARY KEY,
  bucket     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_bucket_created_idx ON rate_limit_events (bucket, created_at);
