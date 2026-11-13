import { BUSINESS_DETAILS } from "@flump/business-details";
import { describe, expect, it } from "vitest";
import { feedbackMailto, SUPPORT_EMAIL } from "./support";

describe("feedbackMailto", () => {
  it("addresses the support mailbox and puts only route key and version in the subject", () => {
    const href = feedbackMailto("/app/mortgage", "1.28.0");
    const url = new URL(href);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(SUPPORT_EMAIL);
    expect(url.searchParams.get("subject")).toBe("Flump feedback [/app/mortgage] [1.28.0]");
    expect(url.searchParams.has("body")).toBe(false);
  });

  it("encodes the subject safely", () => {
    const href = feedbackMailto("a&b", "1 0");
    expect(href).not.toContain(" ");
    expect(href).not.toContain("&b");
  });

  it("reads the mailbox from the business details config", () => {
    expect(SUPPORT_EMAIL).toBe(BUSINESS_DETAILS.supportEmail.value);
    if (BUSINESS_DETAILS.supportEmail.isPlaceholder)
      expect(SUPPORT_EMAIL.endsWith(".invalid")).toBe(true);
  });
});
