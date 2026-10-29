# Going live

Production runs on Vercel, with the database provisioned by GitHub Actions.
Everything is automated by `.github/workflows/deploy.yml`; the only manual part
is creating the two accounts and pasting **two** secrets into GitHub.

## One-time setup (about five minutes)

### 1. Create a Postgres database

Any managed Postgres works — Neon (free tier is plenty), Supabase, Railway, RDS.
Create the project and copy the **pooled** connection string. It looks like:

```
postgresql://user:password@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Nothing needs to be run against it by hand: the pipeline applies migrations and
seeds the shop on its first run.

### 2. Create a Vercel token

<https://vercel.com/account/tokens> → **Create Token** → scope _Full Account_,
expiry "No expiration". Copy it once; Vercel never shows it again.

### 3. Add two repository secrets

<https://github.com/haidermateen919-code/Repair-Status-Tracker/settings/secrets/actions>
→ **New repository secret**, twice:

| Name             | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| `PRODUCTION_ENV` | The dotenv block from the deployment checklist (see below). |
| `VERCEL_TOKEN`   | The token from step 2.                                      |

`PRODUCTION_ENV` is a single multi-line value — every runtime setting in one
secret, so there is nothing to keep in sync later:

```dotenv
AUTH_SECRET="..."                 # openssl rand -base64 32
DATABASE_URL="postgresql://..."   # from step 1
SEED_OWNER_EMAIL="owner@shop.pk"
SEED_OWNER_PASSWORD="..."         # 12+ characters
SEED_OWNER_NAME="Shop Owner"
SHOP_NAME="Al-Madina Appliances"
SHOP_PHONE="03001234567"
SHOP_WHATSAPP="03001234567"
SHOP_ADDRESS="G-11 Markaz, Islamabad"
SHOP_TIMINGS="9am–8pm, Monday closed"
APP_BASE_URL=""                   # optional; only for a custom domain
```

`deploy.yml` reads this file, exports the values, runs the provisioning script
against `DATABASE_URL`, and copies the same values into the Vercel project's
production environment. `APP_BASE_URL` may stay empty: share links are then
built from the request's forwarded headers, which is correct on Vercel.

## What the pipeline does

On every push to `main` (or manually via **Actions → Deploy → Run workflow**):

1. installs dependencies and runs the quality gate — typecheck, lint, tests;
2. `npm run provision`: applies pending migrations, seeds the shop and the owner
   account (idempotent — an existing shop or owner is left untouched), and
   prints the resulting counts;
3. creates the Vercel project if it does not exist and links it;
4. pushes the runtime environment variables into the project (secrets stored as
   sensitive, shop details as readable config);
5. builds and deploys the prebuilt output to production;
6. smoke-tests the live URL: `/login` must return 200 and `/track` must send
   `X-Robots-Tag: noindex`.

The job fails loudly if either secret is missing or a required key is absent
from `PRODUCTION_ENV`, so a half-configured repository can never ship a broken
build. The deployment URL is printed in the run summary.

## Changing configuration later

Edit the `PRODUCTION_ENV` secret and re-run the workflow (**Actions → Deploy →
Run workflow**). Both the database and the Vercel project are updated from it.
Rotating `SEED_OWNER_PASSWORD` only affects a _new_ seed; to change the existing
owner password use `npm run db:reset-password -- --generate` against production.

## After the first successful deploy

1. Sign in and change the owner password if it was shared over chat.
2. Schedule `npm run db:purge` (removes delivered jobs past the retention
   window) — a Vercel Cron entry pointing at a small route, or any external
   scheduler.
3. Turn on the provider's automated backups / point-in-time recovery.

## Rolling back

Vercel keeps every deployment: promote the previous one from the dashboard.
Migrations are forward-only and additive, so an older build keeps working
against a newer schema.
