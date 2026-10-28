# Going live

This file records how the app reaches production, and what is already automated.
Everything here is driven by `.github/workflows/deploy.yml`; nothing is done by hand
except creating the two accounts and pasting three values into GitHub.

## What the pipeline does

On every push to `main` (or manually via **Actions → Deploy → Run workflow**) it:

1. installs dependencies and runs the quality gate — typecheck, lint, 229 tests;
2. runs `npm run provision` against the production database: applies pending
   migrations, seeds the shop and the single owner account (idempotent — safe to
   run on every deploy), then prints the resulting shop/owner/job counts;
3. links (or creates) the Vercel project and syncs `DATABASE_URL`, `AUTH_SECRET`
   and optionally `APP_BASE_URL` into its production environment;
4. builds and deploys the prebuilt output;
5. smoke-tests the live URL: `/login` must return 200 and `/track` must carry
   `X-Robots-Tag: noindex`.

The job fails loudly if any required secret is missing, so a half-configured
repository can never ship a broken build.

## What must exist

| Thing                     | Who creates it                              | Notes                                                                                 |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Postgres database         | Shop owner (Neon, Supabase, RDS — anything) | Free tier is enough; the app needs one small database and a pooled connection string. |
| Vercel account + token    | Shop owner                                  | <https://vercel.com/account/tokens> → _Create Token_, scope "Full Account".           |
| GitHub repository secrets | Shop owner, once                            | See below.                                                                            |

The agent sandbox can reach a Postgres server on port 5432 but **not** the Vercel
or Neon control-plane APIs, so account creation cannot be scripted from there;
GitHub Actions runners have full internet access, which is why the deploy lives in
a workflow.

## Required repository secrets

Generate the long values locally rather than inventing them by hand:

```bash
openssl rand -base64 32   # AUTH_SECRET  (session signing key)
openssl rand -base64 24   # SEED_OWNER_PASSWORD (initial owner password)
```

| Secret                         | Example / source                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | `postgresql://user:pass@host/db?sslmode=require`                                                                                 |
| `AUTH_SECRET`                  | 32 random bytes, base64                                                                                                          |
| `VERCEL_TOKEN`                 | from the Vercel dashboard                                                                                                        |
| `SEED_OWNER_EMAIL`             | `owner@yourshop.pk`                                                                                                              |
| `SEED_OWNER_PASSWORD`          | 12+ characters                                                                                                                   |
| `SEED_OWNER_NAME`              | `Shop Owner`                                                                                                                     |
| `SHOP_NAME`                    | `Al-Madina Appliances`                                                                                                           |
| `SHOP_PHONE`                   | `03001234567` (display form)                                                                                                     |
| `SHOP_WHATSAPP`                | `03001234567` (used for `wa.me` links)                                                                                           |
| `SHOP_ADDRESS`, `SHOP_TIMINGS` | optional, shown on the public status page                                                                                        |
| `APP_BASE_URL`                 | optional; set only for a custom domain. Without it, share links use the request's forwarded headers, which is correct on Vercel. |

## After the first successful deploy

1. `npm run db:reset-password -- --generate` against production (or change the
   password from a secure session) so the seeded password is not left in place.
2. Schedule `npm run db:purge` (deletes delivered jobs older than the retention
   window) — a Vercel Cron entry or any external scheduler hitting a small
   endpoint works.
3. Turn on database backups/PITR in the provider dashboard.

## Rolling back

Vercel keeps every deployment; promote the previous one from the dashboard.
Database migrations are forward-only and additive, so an older build keeps
working against a newer schema.
