#!/usr/bin/env node
/**
 * End-to-end acceptance test for the two PRD journeys, run against a real
 * production build over HTTP:
 *
 *   (a) owner logs in → creates a job → sets it Ready → the customer's existing
 *       link shows Ready (no new link), then the job is deleted and the link dies;
 *   (b) a customer who lost the link finds the job by phone number.
 *
 * It also proves the negative paths: wrong password, logged-out /app, cross-origin
 * writes, and no customer PII in any public response.
 *
 * Usage: npm run test:e2e        (builds if needed, starts a server on :3210)
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.E2E_PORT ?? 3210);
// 127.0.0.1 (not "localhost"): avoids IPv6/IPv4 resolution surprises in CI.
const BASE = `http://127.0.0.1:${PORT}`;
const OWNER_EMAIL = "e2e-owner@shop.pk";
const OWNER_PASSWORD = "e2e-password-12345";
const CUSTOMER_PHONE = "03001234567";

// By default the run uses a throwaway embedded database. Set E2E_DATABASE_URL to
// run the same checks against a real Postgres (CI service container, staging, …).
const externalDatabaseUrl = process.env.E2E_DATABASE_URL?.trim() || "";
const dataDir = externalDatabaseUrl ? "" : mkdtempSync(join(tmpdir(), "repair-e2e-"));
const env = {
  ...process.env,
  ...(externalDatabaseUrl ? {} : { PGLITE_DIR: join(dataDir, "pglite") }),
  DATABASE_URL: externalDatabaseUrl,
  AUTH_SECRET: "e2e-secret-value-that-is-long-enough-1234567890",
  APP_BASE_URL: BASE,
  SEED_OWNER_EMAIL: OWNER_EMAIL,
  SEED_OWNER_PASSWORD: OWNER_PASSWORD,
  SEED_OWNER_NAME: "E2E Owner",
  SHOP_NAME: "E2E Appliances",
  SHOP_PHONE: "03011111111",
  SHOP_WHATSAPP: "03011111111",
  SHOP_ADDRESS: "Test Bazaar",
  SHOP_TIMINGS: "9am-8pm",
  NODE_ENV: "production",
  NEXT_DIST_DIR: ".next-e2e",
};

let passed = 0;
function check(name) {
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function runScript(script) {
  const result = spawnSync("npx", ["tsx", script], { env, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stdout ?? "");
    console.error(result.stderr ?? "");
    throw new Error(`${script} failed`);
  }
}

/** Minimal cookie jar — enough for Auth.js session cookies. */
const jar = new Map();
function rememberCookies(response) {
  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (value === "") jar.delete(name);
    else jar.set(name, value);
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path, init = {}, { withCookies = true } = {}) {
  const headers = new Headers(init.headers ?? {});
  if (withCookies && jar.size > 0) headers.set("cookie", cookieHeader());
  const response = await fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
  rememberCookies(response);
  return response;
}

const originHeader = { origin: BASE, host: `127.0.0.1:${PORT}` };

async function login(password) {
  const csrfResponse = await request("/api/auth/csrf", {}, { withCookies: false });
  const { csrfToken } = await csrfResponse.json();

  const body = new URLSearchParams({
    csrfToken,
    email: OWNER_EMAIL,
    password,
    callbackUrl: `${BASE}/app`,
  });

  return request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...originHeader },
    body,
  });
}

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/login`);
      if (response.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Server did not start in time");
}

async function main() {
  console.log(
    `[e2e] database: ${externalDatabaseUrl ? "external Postgres (E2E_DATABASE_URL)" : "embedded PGlite"}`,
  );
  console.log("[e2e] building (isolated output in .next-e2e)…");
  runScript("scripts/migrate.ts");
  runScript("scripts/seed.ts");
  const build = spawnSync(join(process.cwd(), "node_modules", ".bin", "next"), ["build"], {
    env,
    encoding: "utf8",
  });
  if (build.status !== 0) {
    console.error(build.stdout ?? "");
    console.error(build.stderr ?? "");
    throw new Error("next build failed");
  }

  console.log("[e2e] starting production server…");
  // Run Next directly (not through npx) in its own process group, so the whole
  // server tree can be shut down reliably when the script ends.
  const server = spawn(
    join(process.cwd(), "node_modules", ".bin", "next"),
    ["start", "-p", String(PORT)],
    {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  let serverLog = "";
  server.stdout.on("data", (chunk) => (serverLog += chunk.toString()));
  server.stderr.on("data", (chunk) => (serverLog += chunk.toString()));

  const shutdown = () => {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
    server.stdout?.destroy();
    server.stderr?.destroy();
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  };

  try {
    await waitForServer();

    console.log("\n[e2e] Guest access");
    const loginPage = await request("/login");
    assert.equal(loginPage.status, 200);
    check("login page is public");

    const guarded = await request("/app");
    assert.equal(guarded.status, 307);
    assert.match(guarded.headers.get("location") ?? "", /\/login/);
    check("logged-out /app redirects to /login");

    const unauthorisedApi = await request("/api/jobs");
    assert.equal(unauthorisedApi.status, 401);
    check("logged-out API returns 401");

    console.log("\n[e2e] (a) Owner journey");
    const wrongLogin = await login("definitely-wrong-password");
    assert.equal(wrongLogin.status, 302);
    assert.match(wrongLogin.headers.get("location") ?? "", /error=CredentialsSignin/);
    const afterWrong = await request("/api/auth/session");
    assert.equal(await afterWrong.text(), "null");
    check("wrong password is rejected and issues no session");

    const goodLogin = await login(OWNER_PASSWORD);
    assert.equal(goodLogin.status, 302);
    assert.doesNotMatch(goodLogin.headers.get("location") ?? "", /error=/);
    const session = await (await request("/api/auth/session")).json();
    assert.equal(session.user.email, OWNER_EMAIL);
    check("owner logs in and receives a session");

    const dashboard = await request("/app");
    assert.equal(dashboard.status, 200);
    assert.match(await dashboard.text(), /Naya job/);
    check("dashboard renders with the + Naya job action");

    const created = await request("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", ...originHeader },
      body: JSON.stringify({
        customerName: "E2E Customer",
        customerPhone: CUSTOMER_PHONE,
        itemName: "Geyser",
        issue: "heating nahi kar raha",
        estimateDays: 3,
      }),
    });
    assert.equal(created.status, 201);
    const job = await created.json();
    assert.ok(job.publicUrl.startsWith(`${BASE}/s/`));
    check(`job #${job.jobNumber} created with a public link`);

    const publicPage = await request(`/s/${job.publicToken}`);
    assert.equal(publicPage.status, 200);
    const html = await publicPage.text();
    assert.match(html, /Aap ki cheez dukaan pe mil gayi hai\./);
    assert.doesNotMatch(html, /E2E Customer/);
    assert.doesNotMatch(html, /0300 ?1234567/);
    assert.equal(publicPage.headers.get("x-robots-tag")?.includes("noindex"), true);
    check("public status page shows Received, carries noindex, leaks no PII");

    const crossOrigin = await request(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
        host: `localhost:${PORT}`,
      },
      body: JSON.stringify({ status: "READY" }),
    });
    assert.equal(crossOrigin.status, 400);
    check("cross-origin status change is rejected");

    const ready = await request(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...originHeader },
      body: JSON.stringify({ status: "READY", publicNote: "Aaj shaam aa jayen" }),
    });
    assert.equal(ready.status, 200);
    check("owner sets the job Ready");

    const sameLink = await request(`/s/${job.publicToken}`);
    const sameLinkHtml = await sameLink.text();
    assert.equal(sameLink.status, 200);
    assert.match(sameLinkHtml, /Aap ki cheez theek ho gayi hai\. Dukaan se le jayen\./);
    assert.match(sameLinkHtml, /Aaj shaam aa jayen/);
    check("the SAME link now shows Ready (the product promise)");

    const publicApi = await (await request(`/api/public/jobs/${job.publicToken}`)).json();
    assert.equal(publicApi.status, "READY");
    assert.equal("customerPhone" in publicApi, false);
    assert.equal("customerName" in publicApi, false);
    assert.equal("internalNote" in publicApi, false);
    check("public API returns status without customer identity");

    console.log("\n[e2e] (b) Customer who lost the link");
    const trackPage = await request("/track");
    assert.equal(trackPage.status, 200);
    check("/track is public");

    const lookup = await request("/api/public/lookup", {
      method: "POST",
      headers: { "content-type": "application/json", ...originHeader },
      body: JSON.stringify({ phone: "0300 1234567" }),
    });
    assert.equal(lookup.status, 200);
    const lookupBody = await lookup.json();
    assert.equal(lookupBody.items.length, 1);
    assert.equal(lookupBody.items[0].jobNumber, job.jobNumber);
    assert.equal("issue" in lookupBody.items[0], false);
    check("phone lookup returns the job in the reduced shape");

    const ownPage = await request(`/s/${lookupBody.items[0].token}`);
    assert.match(await ownPage.text(), /ready|Ready/i);
    check("lookup result opens the same status page");

    const unknownNumber = await (
      await request("/api/public/lookup", {
        method: "POST",
        headers: { "content-type": "application/json", ...originHeader },
        body: JSON.stringify({ phone: "03459999999" }),
      })
    ).json();
    assert.deepEqual(unknownNumber.items, []);
    check("unknown number returns an empty list, not an error");

    console.log("\n[e2e] Deletion and session teardown");
    const deleted = await request(`/api/jobs/${job.id}`, {
      method: "DELETE",
      headers: originHeader,
    });
    assert.equal(deleted.status, 202);
    const deadLink = await request(`/s/${job.publicToken}`);
    assert.equal(deadLink.status, 404);
    check("deleted job's link stops working");

    const signOut = await request("/api/auth/signout", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", ...originHeader },
      body: new URLSearchParams({ csrfToken: await currentCsrf(), callbackUrl: `${BASE}/login` }),
    });
    assert.equal(signOut.status, 302);
    const afterSignOut = await request("/app");
    assert.equal(afterSignOut.status, 307);
    check("logout clears the session");

    console.log(`\n[e2e] all ${passed} checks passed`);
  } catch (error) {
    console.error("\n[e2e] FAILED:", error instanceof Error ? error.message : error);
    console.error("\n--- server log (tail) ---\n" + serverLog.split("\n").slice(-40).join("\n"));
    process.exitCode = 1;
  } finally {
    shutdown();
  }
}

async function currentCsrf() {
  const response = await request("/api/auth/csrf");
  return (await response.json()).csrfToken;
}

// Hard stop: never leave a stray server or a hanging process behind.
const guard = setTimeout(() => {
  console.error("[e2e] timed out");
  process.exit(1);
}, 240_000);

try {
  await main();
} finally {
  clearTimeout(guard);
  process.exit(process.exitCode ?? 0);
}
