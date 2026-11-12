import { describe, expect, it } from "vitest";
import { redactString } from "./redact.js";
import { scrubBreadcrumb, scrubEvent } from "./scrub-event.js";

describe("percent-encoded and userinfo handling", () => {
  it.each([
    "/users/jane.doe%40example.com/profile",
    "/users/jane.doe%2540example.com/profile",
    "/users/%75ser%40x.com/profile",
  ])("redacts the encoded email in %s everywhere", (path) => {
    const out = scrubEvent({
      request: { url: `https://a.test${path}` },
      transaction: `GET ${path}`,
      breadcrumbs: [{ category: "navigation", data: { url: path, from: path, to: path } }],
    });
    const json = JSON.stringify(out);
    expect(json).not.toMatch(/jane|example\.com|user%|x\.com/i);
    expect(json).toContain("/profile");
  });

  it("redacts segments that fail to decode and encoded digit runs", () => {
    expect(scrubEvent({ request: { url: "https://a.test/100%/x" } })?.request?.url).toBe(
      "https://a.test/[redacted]/x",
    );
    expect(
      scrubEvent({ request: { url: "https://a.test/%31%32%33%34%35%36%37/x" } })?.request?.url,
    ).toBe("https://a.test/[redacted]/x");
    expect(scrubEvent({ request: { url: "https://a.test/a%20b/x" } })?.request?.url).toBe(
      "https://a.test/a%20b/x",
    );
  });

  it("strips userinfo up to the last @ in the authority", () => {
    expect(scrubEvent({ request: { url: "http://user:p@ss@h.com/a?x=1" } })?.request?.url).toBe(
      "http://h.com/a",
    );
    expect(scrubEvent({ request: { url: "http://h.com?q=1" } })?.request?.url).toBe("http://h.com");
    expect(
      scrubBreadcrumb({ category: "xhr", data: { url: "http://u:p@ss@h.com/a" } })?.data,
    ).toEqual({ url: "/a" });
  });
});

describe("transaction cleaning", () => {
  it("keeps long routes, drops userinfo and redacts identifiers", () => {
    expect(
      scrubEvent({
        transaction: "GET https://u:p@api.flump.app/v1/accounts/12345678/transactions?x=1",
      })?.transaction,
    ).toBe("GET https://api.flump.app/v1/accounts/[redacted]/transactions");
    expect(scrubEvent({ transaction: "plain job bob@gmail.com" })?.transaction).toBe(
      "plain job [redacted]",
    );
  });

  it("bounds very long transactions", () => {
    const out = scrubEvent({ transaction: "a ".repeat(20000) })?.transaction ?? "";
    expect(out.length).toBeLessThanOrEqual(8192);
  });
});

describe("tag and identifier constraints", () => {
  it("keeps os.name and browser.name tags but redacts other name tags", () => {
    expect(
      scrubEvent({ tags: { "os.name": "macOS", "browser.name": "Chrome", "user.name": "bob" } })
        ?.tags,
    ).toEqual({ "os.name": "macOS", "browser.name": "Chrome", "user.name": "[redacted]" });
  });

  it("drops id-like fields that are malformed, too long or contain an email", () => {
    const out = scrubEvent({
      release: "bob@gmail.com",
      environment: "has space",
      event_id: "a".repeat(201),
      platform: "node",
      level: "err/or",
      type: "transaction",
    });
    expect(out).toEqual({ platform: "node", type: "transaction" });
  });

  it("keeps a 32-hex event_id and a full commit sha", () => {
    const id = "ab".repeat(16);
    const sha = `${"c0ffee".repeat(6)}abcd`;
    expect(scrubEvent({ event_id: id, release: sha })).toEqual({ event_id: id, release: sha });
  });

  it("validates breadcrumb type and level the same way", () => {
    expect(scrubBreadcrumb({ category: "http", type: "bob@gmail.com", level: "info" })).toEqual({
      category: "http",
      level: "info",
      data: {},
    });
  });
});

describe("filename and financial patterns", () => {
  it("strips home directories case-insensitively", () => {
    const frames = [
      { filename: "/USERS/Bob/app/a.js" },
      { filename: "C:\\users\\Bob\\app\\b.js" },
      { filename: "/HOME/bob/app/c.js" },
    ];
    const out = scrubEvent({ exception: { values: [{ stacktrace: { frames } }] } });
    expect(JSON.stringify(out)).not.toMatch(/bob/i);
  });

  it.each([
    ["spaced IBAN", "pay GB82 WEST 1234 5698 7654 32 now", "WEST"],
    ["short spaced IBAN", "DE89 3704 0044 0532 0130 00", "3704"],
    ["unspaced IBAN", "iban GB82WEST12345698765432 end", "WEST1234"],
    ["card spaced", "card 4111 1111 1111 1111 end", "4111"],
    ["card dashed", "card 4111-1111-1111-1111 end", "4111"],
  ])("redacts %s", (_label, input, leaked) => {
    expect(redactString(input)).not.toContain(leaked);
  });

  it("is fast on IBAN and card look-alikes", () => {
    for (const input of [
      `GB82${" abcd".repeat(3000)}`,
      "1234 ".repeat(3000),
      `GB82${"A".repeat(8000)}`,
    ]) {
      const start = performance.now();
      redactString(input);
      expect(performance.now() - start).toBeLessThan(200);
    }
  });
});
