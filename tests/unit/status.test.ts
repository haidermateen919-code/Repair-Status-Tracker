import { describe, expect, it } from "vitest";

import { copy } from "@/content/copy";
import {
  ACTIVE_STATUSES,
  JOB_STATUSES,
  PRIMARY_STATUSES,
  STATUS_THEME,
  canTransition,
  isActiveStatus,
  isJobStatus,
  isPrimaryStatus,
  isReady,
  isTerminalStatus,
  parseJobStatus,
  type JobStatus,
} from "@/lib/status";

describe("status catalogue", () => {
  it("contains exactly the six statuses from the PRD", () => {
    expect([...JOB_STATUSES]).toEqual([
      "RECEIVED",
      "IN_REPAIR",
      "WAITING_FOR_PART",
      "READY",
      "DELIVERED",
      "CANCELLED",
    ]);
  });

  it("gives every status English + Roman Urdu copy", () => {
    for (const status of JOB_STATUSES) {
      const entry = copy.status[status];
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.customerMessage.length).toBeGreaterThan(0);
      expect(entry.ownerHelper.length).toBeGreaterThan(0);
    }
  });

  it("matches the PRD customer messages verbatim", () => {
    expect(copy.status.RECEIVED.customerMessage).toBe("Aap ki cheez dukaan pe mil gayi hai.");
    expect(copy.status.IN_REPAIR.customerMessage).toBe("Abhi repair ho rahi hai.");
    expect(copy.status.WAITING_FOR_PART.customerMessage).toBe(
      "Part ka intezar hai — thoda waqt lagega.",
    );
    expect(copy.status.READY.customerMessage).toBe(
      "Aap ki cheez theek ho gayi hai. Dukaan se le jayen.",
    );
    expect(copy.status.DELIVERED.customerMessage).toBe("Aap ki cheez de di gayi hai. Shukriya!");
    expect(copy.status.CANCELLED.customerMessage).toBe(
      "Yeh repair cancel kar di gayi hai. Dukaan se rabta karein.",
    );
  });

  it("themes every status with an icon, chip class and dot class", () => {
    for (const status of JOB_STATUSES) {
      expect(STATUS_THEME[status].icon).toBeTruthy();
      expect(STATUS_THEME[status].chipClassName).toContain("bg-status-soft-");
      expect(STATUS_THEME[status].dotClassName).toContain("bg-status-");
    }
  });
});

describe("status predicates", () => {
  it("classifies active statuses", () => {
    expect(ACTIVE_STATUSES).toEqual(["RECEIVED", "IN_REPAIR", "WAITING_FOR_PART"]);
    expect(isActiveStatus("RECEIVED")).toBe(true);
    expect(isActiveStatus("READY")).toBe(false);
    expect(isActiveStatus("CANCELLED")).toBe(false);
  });

  it("classifies terminal statuses", () => {
    expect(isTerminalStatus("DELIVERED")).toBe(true);
    expect(isTerminalStatus("CANCELLED")).toBe(true);
    expect(isTerminalStatus("READY")).toBe(false);
  });

  it("keeps Cancelled out of the one-tap buttons", () => {
    expect(PRIMARY_STATUSES).not.toContain("CANCELLED");
    expect(isPrimaryStatus("CANCELLED")).toBe(false);
    expect(isPrimaryStatus("READY")).toBe(true);
  });

  it("identifies ready jobs for the oldest-first sort", () => {
    expect(isReady("READY")).toBe(true);
    expect(isReady("IN_REPAIR")).toBe(false);
  });

  it("parses only real statuses", () => {
    expect(isJobStatus("READY")).toBe(true);
    expect(isJobStatus("ready")).toBe(false);
    expect(isJobStatus(undefined)).toBe(false);
    expect(parseJobStatus("IN_REPAIR")).toBe("IN_REPAIR");
    expect(parseJobStatus("SHIPPED")).toBeNull();
  });
});

describe("canTransition", () => {
  const statuses = [...JOB_STATUSES];

  it("allows any move inside the workflow", () => {
    for (const from of statuses.filter((status) => !isTerminalStatus(status))) {
      for (const to of statuses) {
        if (from === to) continue;
        expect(canTransition(from, to).allowed).toBe(true);
      }
    }
  });

  it("treats setting the same status as an allowed no-op", () => {
    for (const status of statuses) {
      expect(canTransition(status, status).allowed).toBe(true);
    }
  });

  it("requires confirmation to re-open a delivered job", () => {
    const result = canTransition("DELIVERED", "IN_REPAIR");
    expect(result).toEqual({ allowed: false, reason: "REOPEN_REQUIRES_CONFIRMATION" });
  });

  it("requires confirmation to re-open a cancelled job", () => {
    const result = canTransition("CANCELLED", "RECEIVED");
    expect(result.allowed).toBe(false);
  });

  it("allows a delivered job to be marked cancelled without reopening first?", () => {
    // Both are terminal, so moving between them still counts as re-opening:
    // the owner must acknowledge before changing a finished job.
    const result = canTransition("DELIVERED", "CANCELLED");
    expect(result.allowed).toBe(false);
  });

  it("every PRD-documented forward path is allowed", () => {
    const forwardPaths: [JobStatus, JobStatus][] = [
      ["RECEIVED", "IN_REPAIR"],
      ["IN_REPAIR", "WAITING_FOR_PART"],
      ["WAITING_FOR_PART", "IN_REPAIR"],
      ["IN_REPAIR", "READY"],
      ["READY", "DELIVERED"],
      ["RECEIVED", "CANCELLED"],
    ];
    for (const [from, to] of forwardPaths) {
      expect(canTransition(from, to).allowed).toBe(true);
    }
  });
});
