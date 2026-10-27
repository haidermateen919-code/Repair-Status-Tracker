/**
 * Documented password reset path for the single owner account (PRD A6 — there is
 * deliberately no "forgot password" email flow in v1).
 *
 * Usage:
 *   npm run db:reset-password                      # prompts for a new password
 *   npm run db:reset-password -- --generate        # generates and prints one
 *   npm run db:reset-password -- --password '...'  # non-interactive (CI/ops)
 *
 * The new password is never written to disk, git, or logs beyond this terminal.
 */
import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { createDbHandle } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { hashPassword, isAcceptablePassword } from "../src/lib/password";
import { loadEnvFile } from "./_env";
import { runScript } from "./_run";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function resolvePassword(): Promise<string> {
  const provided = argValue("--password");
  if (provided) return provided;

  if (process.argv.includes("--generate")) {
    return randomBytes(12).toString("base64url");
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("New password (min 12 characters): ");
    const confirmation = await rl.question("Repeat password: ");
    if (answer !== confirmation) throw new Error("Passwords did not match");
    return answer;
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const email = (argValue("--email") ?? process.env.SEED_OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!email) throw new Error("Pass --email owner@shop.pk (or set SEED_OWNER_EMAIL).");

  const password = await resolvePassword();
  if (!isAcceptablePassword(password)) {
    throw new Error("Password must be at least 12 characters (and at most 200).");
  }

  const handle = createDbHandle();
  try {
    const existing = await handle.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length === 0) throw new Error(`No account found for ${email}`);

    await handle.db
      .update(users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(users.email, email));

    console.log(`[reset-password] updated the password for ${email}`);
    if (process.argv.includes("--generate")) {
      console.log(`[reset-password] new password: ${password}`);
      console.log("[reset-password] log in, then store it in your password manager.");
    }
  } finally {
    await handle.close();
  }
}

runScript("reset-password", main);
