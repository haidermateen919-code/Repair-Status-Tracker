# Repair Status Tracker

A web app for **one** appliance repair shop. The owner logs a repair in ~30 seconds, shares one
private link on WhatsApp, and the customer's link always shows the live status — no app, no account,
no password for the customer.

- **Owner** (`/login` → `/app`): create jobs, tap a status, see counts, search, share links.
- **Customer** (`/s/<token>`): live status in English + Roman Urdu, expected date, shop contact.
- **Lost link** (`/track`): find a repair by phone number, rate-limited and privacy-reduced.

Built to the product spec in `PRD-repair-status-tracker.md` (v1 scope only: no payments, invoices,
inventory, photos, notifications, or customer accounts).

---

## 1. Quick start (local)

Requirements: **Node.js 20+** (22 recommended). Nothing else — no Docker, no Postgres install.

```bash
npm install
npm run setup     # creates .env with a random secret + owner password, migrates, seeds
npm run dev       # http://localhost:3000
```

> **Restarting after a sandbox/CI reset, or first run after cloning?** Use `npm run preview`:
> it installs dependencies if missing, creates `.env` if missing, migrates, seeds and starts the
> dev server in one step. `npm run dev` alone assumes the steps above already ran.

`npm run setup` prints the owner email and the generated password **once** — keep it safe:

```
  Owner login:  owner@shop.pk
  Password:     <generated password>
```

Sign in at <http://localhost:3000/login>. Edit the `SHOP_*` values in `.env` to the real shop's
name, phone and address, then run `npm run db:seed` again to update the seeded shop.

> **Local database.** With `DATABASE_URL` empty the app runs an embedded PostgreSQL (PGlite) inside
> `.data/pglite`. It is a real Postgres, so the same SQL works in production. **Only one process may
> use it at a time** — stop `npm run dev` before running `db:*` scripts; they refuse to run otherwise.

### Useful scripts

| Command                                       | What it does                                                 |
| --------------------------------------------- | ------------------------------------------------------------ |
| `npm run dev` / `npm run build` / `npm start` | Develop / build / serve                                      |
| `npm run typecheck`                           | TypeScript, `strict` + `noUncheckedIndexedAccess`            |
| `npm run lint` / `npm run format`             | ESLint / Prettier                                            |
| `npm test`                                    | 224 unit + integration tests (Vitest, in-memory Postgres)    |
| `npm run test:e2e`                            | 18 end-to-end checks against a production build over HTTP    |
| `npm run db:migrate`                          | Apply new files in `drizzle/` exactly once each              |
| `npm run db:seed`                             | Create/update the shop + owner (idempotent)                  |
| `npm run db:reset-password`                   | Reset the owner password (`--generate`, or `--password '…'`) |
| `npm run db:purge`                            | Retention cleanup (`--dry-run` to preview)                   |
| `npm run icons`                               | Re-render PWA icons from the SVG source                      |

---

## 2. Configuration

All configuration is environment variables; `.env` is git-ignored and `.env.example` lists every name.
On Vercel set them in _Project → Settings → Environment Variables_.

| Variable                                                                       | Required   | Notes                                                                                                     |
| ------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                                                                  | yes        | ≥32 chars. `openssl rand -base64 32`                                                                      |
| `DATABASE_URL`                                                                 | production | Postgres connection string (Neon works). Empty = embedded PGlite                                          |
| `APP_BASE_URL`                                                                 | no         | Absolute origin used in customer links, e.g. `https://tracker.example.com`. Falls back to request headers |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` / `SEED_OWNER_NAME`                 | seed only  | The single owner account                                                                                  |
| `SHOP_NAME` / `SHOP_PHONE` / `SHOP_WHATSAPP` / `SHOP_ADDRESS` / `SHOP_TIMINGS` | seed only  | Shown on the public status page                                                                           |
| `PGLITE_DIR`                                                                   | no         | Data directory for the embedded database (default `.data/pglite`)                                         |

Secrets never appear in client bundles: only `AUTH_SECRET` and database credentials are read
server-side, and every secret is validated in `src/lib/env.ts` at startup.

---

## 3. Deploying

1. Push the repo to GitHub and import it on **Vercel** (framework auto-detected).
2. Create a Postgres database (Neon free tier) and set `DATABASE_URL` — keep `?sslmode=require`.
3. Set `AUTH_SECRET` and `APP_BASE_URL` (`https://your-domain`).
4. Run the migration and seed once against production:
   ```bash
   DATABASE_URL='postgresql://…' npm run db:migrate
   DATABASE_URL='postgresql://…' SEED_OWNER_EMAIL=… SEED_OWNER_PASSWORD=… \
     SHOP_NAME=… SHOP_PHONE=… SHOP_WHATSAPP=… npm run db:seed
   ```
5. Open the app, log in, and change the seeded password (`npm run db:reset-password`).

HSTS, `X-Frame-Options`, `nosniff` and a CSP are set in `next.config.ts`; public pages additionally
send `X-Robots-Tag: noindex` and `Cache-Control: no-store`. HTTPS is required in production — Auth.js
marks the session cookie `Secure` when the request arrives over HTTPS.

**Backups / restore (Neon).** Enable _point-in-time restore_ (default on paid tiers; branches on free).
To restore: create a branch from a past timestamp, copy its `DATABASE_URL` into a preview deployment,
verify the jobs look right, then promote it. `pg_dump` also works:
`pg_dump "$DATABASE_URL" > backup.sql` / `psql "$DATABASE_URL" < backup.sql`.

---

## 4. How the code is organised

```
src/
├─ app/                      Next.js App Router (routes only; no business logic)
│  ├─ login/                 owner login
│  ├─ app/                   authed shell → dashboard, new job, job detail
│  ├─ s/[token]/             public status page (+ generic invalid-link page)
│  ├─ track/                 phone-number fallback
│  ├─ api/                   route handlers: parse → authorise → delegate → serialise
│  └─ dev/ui/                design-system reference (development only)
├─ components/               presentational React (ui/ = shadcn-style primitives)
├─ content/copy.ts           EVERY user-facing string (English + Roman Urdu)
├─ lib/
│  ├─ db/                    Drizzle schema, driver (pg | PGlite), data-dir lock
│  ├─ services/              all database access: jobs, public-jobs, shop, users
│  ├─ schemas/               Zod validation for every endpoint
│  ├─ auth.ts / auth.config.ts   Auth.js setup, requireOwner(), session helpers
│  ├─ status.ts phone.ts dates.ts urls.ts timeline.ts   pure, unit-tested logic
│  ├─ rate-limit.ts          Postgres sliding-window limiter
│  └─ http.ts errors.ts logger.ts    HTTP plumbing, typed errors, PII-free logs
└─ types/contracts.ts        API response shapes (shared with any future mobile app)
drizzle/                     SQL migrations (applied by scripts/migrate.ts)
scripts/                     migrate, seed, seed-env, reset-password, purge, e2e, icons
tests/unit/ tests/integration/   Vitest
```

**Rules that keep it maintainable**

- Route handler → `src/lib/services/*` → database. No SQL in components, no business rules in routes.
- One authorisation helper (`requireOwner` / `requireOwnerApi`) — adding staff later is one file.
- Every job query takes `shopId` from the session, never from the request.
- All user-facing text lives in `copy.ts`; all colours are Tailwind tokens. A full-Urdu/RTL release is
  a copy-file + `dir="rtl"` change, not a rewrite.

### Data model

`Shop` (one row: name, contact, `jobSeq`) → `Job` (customer name/phone, item, fault, status,
expected date, public + internal notes, soft-delete) → `JobEvent` (status change or public-note
change; the timeline is derived, never typed by hand). `RateLimitEvent` backs the limiter.
Job numbers come from an atomic `UPDATE … RETURNING` on `Shop.jobSeq`, so concurrent saves can never
collide.

---

## 5. Security decisions (and where they live)

| Concern                      | Mitigation                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Customer link guessing       | 256-bit CSPRNG token (`randomBytes(32)`), unique index, never derived from ids                                                |
| Link leakage                 | `noindex`, `no-store`, no PII in public responses or HTML; tokens redacted in logs                                            |
| Cross-site request forgery   | `SameSite=Lax` cookies **plus** an Origin check on every write                                                                |
| XSS                          | React escaping only; no `dangerouslySetInnerHTML`; strict input length caps                                                   |
| SQL injection                | Drizzle parameterised queries everywhere (no string-built SQL)                                                                |
| Brute force                  | argon2id hashes; 5 failed logins / 15 min per IP **and** per email                                                            |
| Phone enumeration            | 10 lookups / 15 min per IP, 30 / hour per number, honeypot, fixed 150 ms delay, reduced shape, empty-list (not 404) responses |
| Unauthorised API access      | Every owner route starts with `requireOwnerApi()`; middleware redirects `/app`                                                |
| Oversized/malformed requests | 16 KB body cap, strict Zod schemas that reject unknown keys                                                                   |
| Data retention               | `npm run db:purge`: soft-deleted now, cancelled after 90 days, delivered after 24 months                                      |

**Deleting a customer's data** (e.g. on request): soft-delete the job in the UI (its link stops
working immediately), then run `npm run db:purge` to remove the row and its events permanently.

**Logging** is structured JSON, ids and status codes only — no names, phones, notes or tokens.

---

## 6. Testing

```bash
npm test          # 224 tests: pure logic, services, rate limiter, HTTP contracts
npm run test:e2e  # builds, seeds a throwaway database, drives both PRD journeys over HTTP
```

Both suites can also run against a **real PostgreSQL** (the production driver), which is how the
concurrency-sensitive paths are verified:

```bash
DATABASE_URL='postgresql://user:pass@host/db' npm run db:migrate
DATABASE_URL='postgresql://user:pass@host/db' npx vitest run --config vitest.pg.config.mts
E2E_DATABASE_URL='postgresql://user:pass@host/db2' npm run test:e2e
```

CI runs both: the fast embedded suite, plus a `postgres:18` service job that exercises the `pg` driver
and real concurrent writes (job numbering and rate-limit admission are asserted to be exact).

The end-to-end script (`scripts/e2e.mjs`) proves the product promise end to end: the owner logs in,
creates a job, sets it **Ready**, and the _same_ customer URL now shows Ready; the customer finds the
job by phone; a deleted job's link dies; a wrong password and a logged-out session are rejected;
cross-origin writes are blocked; no customer PII appears in any public response.

Not covered automatically: real-browser rendering (Playwright is the recommended addition to CI when
browser binaries are available). Loading, error and offline states are verified manually.

---

## 7. Known limits / next steps

- **One shop, one owner.** The schema is already scoped by `shopId`; multi-shop is additive.
- **Embedded Postgres is single-process.** Production uses a real Postgres; the lock file prevents
  accidental concurrent use locally.
- **Search uses `ILIKE`** (no full-text index). Fine for a single shop with ≤100 rows per tab; add a
  trigram index if a shop ever exceeds a few thousand jobs.
- **Pruning paged jobs.** Each tab lists the newest 100 jobs; archive or paginate before that limit
  matters.
- **WhatsApp is a deep link.** Nothing is sent automatically and there are no message costs, by design.
- **No browser-based E2E yet** (see §6) and no Sentry integration; both are additive.
