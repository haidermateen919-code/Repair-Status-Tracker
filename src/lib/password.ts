import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing with argon2id at OWASP-recommended parameters
 * (m = 19 MiB, t = 2, p = 1). PRD §6.2 / §7.1.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** A pre-computed hash of a random string, used to keep failed-login timing flat. */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZXJhbmRvbXNhbHQ$Z9h3S1yC0jVJ2m3G0d5AvXr0cQ1cJ7g2mF8pQb1Y3Zk";

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    // Malformed hash in the database: treat as a failed login, never a crash.
    return false;
  }
}

/**
 * Verifies against a throwaway hash when no user was found so that "unknown
 * email" and "wrong password" take a similar amount of time.
 */
export async function simulatePasswordCheck(plain: string): Promise<void> {
  try {
    await verify(DUMMY_HASH, plain);
  } catch {
    // The dummy hash is only a timing decoy; failures are expected and ignored.
  }
}

/** Minimum bar for the single owner account. */
export function isAcceptablePassword(plain: string): boolean {
  return typeof plain === "string" && plain.length >= 12 && plain.length <= 200;
}
