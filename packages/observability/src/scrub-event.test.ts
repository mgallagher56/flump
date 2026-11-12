import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent } from "./scrub-event.js";

// Token-like fixtures are built at runtime so no scanner matches a literal.
const workosAccess = `${"eyJ"}${"a".repeat(12)}.${"b".repeat(12)}.${"c".repeat(12)}`;
const workosRefresh = `${"r".repeat(8)}${"Q".repeat(40)}`;
const sessionCookie = `wos-session=${"s".repeat(40)}`;
const oauthCode = `${"c0de".repeat(2)}${"Z".repeat(30)}`;
const bankToken = `${"sk_"}${"test_"}${"x".repeat(24)}`;
const mcpPat = `${"flp_"}${"pat".repeat(12)}`;
const mcpPatHash = "9f".repeat(32);
const encKey = `${"k".repeat(16)}${"K".repeat(16)}==`;
const email = "sentinel.person@example.com";
const personName = "Sentinella Fixturesson";
const money = `${"£"}1,234.56`;
const sortCode = "12-34-56";
const accountNumber = "87654321";
const bodyText = "request-body-sentinel";

function fixture() {
  return {
    message: `failed for ${email} paying ${money}`,
    server_name: "host-sentinel",
    extra: { anything: bodyText },
    user: { id: "u1", email, username: personName, ip_address: "1.2.3.4" },
    request: {
      url: `https://app.example.com/callback?code=${oauthCode}&state=x#frag-sentinel`,
      method: "POST",
      data: { body: bodyText },
      cookies: { "wos-session": sessionCookie },
      query_string: `code=${oauthCode}`,
      headers: {
        Authorization: `Bearer ${workosAccess}`,
        Cookie: sessionCookie,
        "user-agent": "UA/1.0",
      },
    },
    contexts: {
      app: { refresh: workosRefresh, bank_token: bankToken, name: personName },
      trace: { note: `pat ${mcpPat} hash ${mcpPatHash} key ${encKey}` },
    },
    tags: { sort_code: sortCode, detail: `acct ${accountNumber} ${sortCode}` },
    logentry: { message: `hit ${email}`, formatted: `hit ${money}`, params: [bodyText] },
    exception: {
      values: [
        {
          type: "TypeError",
          value: `bad ${email} ${workosAccess}`,
          stacktrace: {
            frames: [
              {
                filename: "dist/main.js",
                lineno: 42,
                function: "handler",
                vars: { token: bankToken },
              },
            ],
          },
        },
      ],
    },
  };
}

const SENTINELS = [
  workosAccess,
  workosRefresh,
  sessionCookie,
  oauthCode,
  bankToken,
  mcpPat,
  mcpPatHash,
  encKey,
  email,
  personName,
  money,
  sortCode,
  accountNumber,
  bodyText,
  "host-sentinel",
  "frag-sentinel",
  "1.2.3.4",
];

describe("scrubEvent", () => {
  it.each(SENTINELS)("removes sentinel %#", (sentinel) => {
    expect(JSON.stringify(scrubEvent(fixture()))).not.toContain(sentinel);
  });

  it("deletes user, server_name, extra and request payload fields", () => {
    const out = scrubEvent(fixture());
    expect(out).not.toHaveProperty("user");
    expect(out).not.toHaveProperty("server_name");
    expect(out).not.toHaveProperty("extra");
    expect(out.request).toEqual({
      url: "https://app.example.com/callback",
      method: "POST",
      headers: { "user-agent": "UA/1.0" },
    });
  });

  it("keeps exception type and stack frames but drops frame vars", () => {
    const out = scrubEvent(fixture());
    const ex = out.exception?.values?.[0];
    expect(ex?.type).toBe("TypeError");
    expect(ex?.stacktrace?.frames?.[0]).toEqual({
      filename: "dist/main.js",
      lineno: 42,
      function: "handler",
    });
  });

  it("redacts contexts and tags by key and by pattern", () => {
    const out = scrubEvent(fixture());
    expect(out.contexts).toMatchObject({ app: { name: "[redacted]" } });
    expect(out.tags).toMatchObject({ sort_code: "[redacted]" });
  });

  it("handles a bare event and capitalised user-agent", () => {
    expect(scrubEvent({})).toEqual({});
    const out = scrubEvent({ request: { headers: { "User-Agent": "UA/2" } } });
    expect(out.request).toEqual({ headers: { "user-agent": "UA/2" } });
    expect(scrubEvent({ request: {} }).request).toEqual({});
    expect(scrubEvent({ logentry: {}, exception: { values: [{}] } })).toEqual({
      logentry: {},
      exception: { values: [{}] },
    });
  });

  it("drops a non-string user-agent", () => {
    expect(scrubEvent({ request: { headers: { "user-agent": 5 } } }).request).toEqual({});
  });
});

describe("scrubBreadcrumb", () => {
  it.each(["console", "ui.click", "ui.input", "sentry.event", "custom", ""])(
    "drops category %j",
    (category) => {
      expect(scrubBreadcrumb({ category, message: email })).toBeNull();
    },
  );

  it("drops a breadcrumb with no category", () => {
    expect(scrubBreadcrumb({ message: "x" })).toBeNull();
  });

  it.each(["http", "fetch", "xhr"])("keeps only method, status and path for %s", (category) => {
    const out = scrubBreadcrumb({
      category,
      type: "http",
      level: "info",
      timestamp: 1,
      message: email,
      data: {
        method: "GET",
        status_code: 200,
        url: `https://api.example.com/v1/items?code=${oauthCode}#h`,
        request_body: bodyText,
      },
    });
    expect(out).toEqual({
      category,
      type: "http",
      level: "info",
      timestamp: 1,
      data: { method: "GET", status_code: 200, url: "/v1/items" },
    });
    expect(JSON.stringify(out)).not.toContain(oauthCode);
    expect(JSON.stringify(out)).not.toContain(bodyText);
  });

  it("reduces navigation from/to to paths", () => {
    const out = scrubBreadcrumb({
      category: "navigation",
      data: { from: "/a?x=1", to: "https://app.example.com/b#c" },
    });
    expect(out).toEqual({ category: "navigation", data: { from: "/a", to: "/b" } });
  });

  it("handles a network breadcrumb without data", () => {
    expect(scrubBreadcrumb({ category: "http" })).toEqual({ category: "http", data: {} });
  });
});
