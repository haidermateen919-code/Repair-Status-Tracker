/**
 * Structured JSON logs with a hard rule: no customer PII, no tokens, no
 * passwords (PRD §7.5). Any field whose name looks secret is redacted
 * automatically, and long token-like values are truncated.
 */

type LogValue = string | number | boolean | null | undefined;
export type LogFields = Record<string, LogValue>;

const SENSITIVE_KEY = /token|password|secret|authorization|cookie/i;

function serialise(fields: LogFields | undefined): Record<string, LogValue> {
  if (!fields) return {};

  const safe: Record<string, LogValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(key)) {
      safe[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 120) {
      safe[key] = `${value.slice(0, 117)}…`;
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function write(level: "info" | "warn" | "error", event: string, fields?: LogFields): void {
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...serialise(fields),
  };
  const line = JSON.stringify(entry);
  if (level === "info") {
    process.stdout.write(`${line}\n`);
  } else {
    process.stderr.write(`${line}\n`);
  }
}

export function logInfo(event: string, fields?: LogFields): void {
  write("info", event, fields);
}

export function logWarn(event: string, fields?: LogFields): void {
  write("warn", event, fields);
}

export function logError(event: string, error: unknown, fields?: LogFields): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack?.split("\n").slice(0, 4).join(" | ") : undefined;
  write("error", event, { ...fields, errorMessage: message, stack });
}
