import { describe, expect, it } from "vitest";

import {
  absoluteUrl,
  looksLikePublicToken,
  normaliseBaseUrl,
  publicJobPath,
  publicJobUrl,
  telUrl,
  whatsappShareUrl,
} from "@/lib/urls";
import { redactToken } from "@/lib/tokens";
import { copy } from "@/content/copy";
import { generatePublicToken } from "@/lib/tokens";

describe("public link builders", () => {
  it("builds the documented /s/<token> path", () => {
    expect(publicJobPath("abc123")).toBe("/s/abc123");
  });

  it("joins base URL and token without a double slash", () => {
    expect(publicJobUrl("https://tracker.pk/", "abc123")).toBe("https://tracker.pk/s/abc123");
    expect(publicJobUrl("https://tracker.pk", "abc123")).toBe("https://tracker.pk/s/abc123");
  });

  it("never leaks the job number into the URL", () => {
    const url = publicJobUrl("https://tracker.pk", "abcdefghij");
    expect(url).not.toContain("1042");
  });

  it("normalises base URLs", () => {
    expect(normaliseBaseUrl("https://a.b///")).toBe("https://a.b");
  });

  it("builds absolute URLs for paths", () => {
    expect(absoluteUrl("https://a.b/", "app")).toBe("https://a.b/app");
    expect(absoluteUrl("https://a.b", "/app")).toBe("https://a.b/app");
  });
});

describe("public token", () => {
  it("generates 256 bits in base64url", () => {
    const token = generatePublicToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url").length).toBe(32);
  });

  it("never repeats across many jobs", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generatePublicToken()));
    expect(tokens.size).toBe(500);
  });

  it("is recognised by the cheap shape check used before any DB access", () => {
    expect(looksLikePublicToken(generatePublicToken())).toBe(true);
    expect(looksLikePublicToken("short")).toBe(false);
    expect(looksLikePublicToken("a".repeat(43) + "/")).toBe(false);
    expect(looksLikePublicToken(null)).toBe(false);
  });

  it("is redacted for logs", () => {
    const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
    const redacted = redactToken(token);
    expect(redacted.length).toBeLessThan(token.length);
    expect(redacted).not.toContain(token.slice(10, 30));
  });
});

describe("whatsappShareUrl", () => {
  it("uses digits without the plus and URL-encodes the message", () => {
    const url = whatsappShareUrl("+923001234567", "Assalam-o-alaikum Ali!\nhttps://x.pk/s/abc");
    expect(url.startsWith("https://wa.me/923001234567?text=")).toBe(true);
    expect(url).not.toContain("+");
    const encoded = url.split("?text=")[1] ?? "";
    expect(decodeURIComponent(encoded)).toBe("Assalam-o-alaikum Ali!\nhttps://x.pk/s/abc");
  });

  it("renders the PRD's new-job template with every substitution", () => {
    const message = copy.whatsapp.newJobMessage({
      customerName: "Ali Raza",
      itemName: "Geyser",
      jobNumber: 1042,
      publicUrl: "https://tracker.pk/s/abc",
      shopName: "Al-Madina",
      shopPhone: "0300 1234567",
    });

    expect(message).toContain("Assalam-o-alaikum Ali Raza!");
    expect(message).toContain("Geyser (#1042)");
    expect(message).toContain("https://tracker.pk/s/abc");
    expect(message).toContain("Dukaan: Al-Madina — 0300 1234567");
  });

  it("renders the update template with the same link, never a new one", () => {
    const message = copy.whatsapp.updateMessage({
      customerName: "Ali Raza",
      itemName: "Geyser",
      jobNumber: 1042,
      statusLabel: "Ready",
      publicUrl: "https://tracker.pk/s/abc",
    });

    expect(message).toContain("status update: Ready");
    expect(message).toContain("https://tracker.pk/s/abc");
  });
});

describe("telUrl", () => {
  it("keeps the international prefix", () => {
    expect(telUrl("+923001234567")).toBe("tel:+923001234567");
    expect(telUrl("0300 1234567")).toBe("tel:03001234567");
  });
});

describe("buildShareMessages", () => {
  it("produces both messages from a single source", async () => {
    const { buildShareMessages } = await import("@/lib/share");
    const messages = buildShareMessages(
      {
        customerName: "Ali Raza",
        itemName: "Geyser",
        jobNumber: 1042,
        publicUrl: "https://tracker.pk/s/abc",
        status: "READY",
      },
      { name: "Al-Madina", phone: "0300 1234567" },
    );

    expect(messages.newJobMessage).toContain("https://tracker.pk/s/abc");
    expect(messages.updateMessage).toContain("status update: Ready");
    expect(messages.updateMessage).toContain("https://tracker.pk/s/abc");
  });

  it("uses the same link in both messages, never a per-update link", async () => {
    const { buildShareMessages } = await import("@/lib/share");
    const messages = buildShareMessages(
      {
        customerName: "Ali",
        itemName: "Fan",
        jobNumber: 7,
        publicUrl: "https://x.pk/s/same",
        status: "DELIVERED",
      },
      { name: "Shop", phone: "0300" },
    );

    expect(messages.updateMessage.split("https://x.pk/s/same").length).toBe(2);
  });
});
