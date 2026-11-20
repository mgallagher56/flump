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
      url: `https://usr:pw-sentinel@app.example.com/callback?code=${oauthCode}&state=x#frag-sentinel`,
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
      custom: { leak: email },
    },
    tags: { sort_code: sortCode, detail: `acct ${accountNumber} ${sortCode}`, n: 5 },
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
                context_line: `const t = "${bankToken}"`,
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
  "pw-sentinel",
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
    expect(out?.request).toEqual({
      url: "https://app.example.com/callback",
      method: "POST",
      headers: { "user-agent": "UA/1.0" },
    });
  });

  it("keeps exception type and stack frames but drops source and vars", () => {
    const frame = (
      (scrubEvent(fixture())?.exception?.values ?? []) as {
        type: string;
        stacktrace: { frames: unknown[] };
      }[]
    )[0];
    expect(frame?.type).toBe("TypeError");
    expect(frame?.stacktrace.frames[0]).toEqual({
      filename: "dist/main.js",
      lineno: 42,
      function: "handler",
    });
  });

  it("handles bare and partial events", () => {
    expect(scrubEvent({})).toEqual({});
    expect(scrubEvent({ request: {} })?.request).toEqual({});
    expect(scrubEvent({ request: { headers: { "User-Agent": "UA/2" } } })?.request).toEqual({
      headers: { "user-agent": "UA/2" },
    });
    expect(scrubEvent({ request: { headers: { "user-agent": 5 } } })?.request).toEqual({});
    expect(scrubEvent({ request: { url: "/relative/12345678?x" } })?.request).toEqual({
      url: "/relative/[redacted]",
    });
    expect(scrubEvent({ logentry: {} })?.logentry).toEqual({});
    expect(scrubEvent({ timestamp: "2026-01-01T00:00:00Z" })?.timestamp).toBe(
      "2026-01-01T00:00:00Z",
    );
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
  });

  it("reduces navigation from/to to paths", () => {
    const out = scrubBreadcrumb({
      category: "navigation",
      data: { from: "/a?x=1", to: "https://u:p@app.example.com/b#c" },
    });
    expect(out).toEqual({ category: "navigation", data: { from: "/a", to: "/b" } });
  });

  it("handles a network breadcrumb without data", () => {
    expect(scrubBreadcrumb({ category: "http" })).toEqual({ category: "http", data: {} });
  });
});

// Long values are built at runtime. Each secret mixes in punctuation so no run of it is long enough
// for the generic long-token rule to hide it: only removing it by position keeps it out.
describe("long values are cleaned before they are cut to length", () => {
  const secret = (n: number) => "Pw!z9.".repeat(n);

  it("drops URL userinfo that runs past the 2,048-character URL limit", () => {
    const url = `https://user:${secret(400)}@host.test/p`; // userinfo of about 2,400 characters
    const out = scrubEvent({ request: { url } })?.request?.url ?? "";
    expect(out).toBe("https://host.test/p");
  });

  it("drops a long basic-auth password from the URL", () => {
    const password = `${"eyJ"}${secret(200)}.${secret(200)}`; // about 2,400 characters
    const out = scrubEvent({ request: { url: `https://svc:${password}@api.test/v1/x` } })?.request
      ?.url;
    expect(out).toBe("https://api.test/v1/x");
  });

  it("drops userinfo cut by the transaction name limit", () => {
    // 8,170 characters of words put the userinfo across the 8,192-character limit.
    const name = `${"ab ".repeat(2723)}x https://user:${secret(20)}@host.test/p`;
    const out = scrubEvent({ transaction: name })?.transaction ?? "";
    expect(out).not.toContain("Pw!z9");
    expect(out).not.toContain("user:");
  });

  it("drops a path segment that the URL limit would cut in half", () => {
    // The limit applies to the path, which starts at "/" (index 14 of the URL). In the path the
    // email starts at 1 + 506 * 4 + 2 = 2,027 ("/", 506 copies of "a.b-", then "c/"), so the
    // 2,048-character limit falls 21 characters into it.
    const url = `https://h.test/${"a.b-".repeat(506)}c/sentinel.person@example.com/end`;
    const out = scrubEvent({ request: { url } })?.request?.url ?? "";
    expect(out).not.toContain("sentin");
    expect(out.length).toBeLessThanOrEqual(2048);
  });

  it("drops a home directory that the file path limit would cut", () => {
    const filename = `/Users/${"jo.do-".repeat(400)}/project/src/a.ts`; // user folder of 2,400
    const out = scrubEvent({ exception: { values: [{ stacktrace: { frames: [{ filename }] } }] } });
    expect(JSON.stringify(out)).not.toContain("jo.do-");
  });

  it("leaves ordinary URLs as they were, apart from userinfo, query and hash", () => {
    const clean = (url: string) => scrubEvent({ request: { url } })?.request?.url;
    expect(clean("https://api.example.test/v1/accounts")).toBe(
      "https://api.example.test/v1/accounts",
    );
    expect(clean("https://u:p@api.example.test/v1/accounts?page=2#top")).toBe(
      "https://api.example.test/v1/accounts",
    );
    expect(clean("/v1/accounts")).toBe("/v1/accounts");
    // Host names and IP addresses keep their digits and shape.
    expect(clean("http://192.168.1.10:8080/api/x")).toBe("http://192.168.1.10:8080/api/x");
    expect(clean("https://flump-web-pr-123456.up.railway.app/a")).toBe(
      "https://flump-web-pr-123456.up.railway.app/a",
    );
    const longLabel = `${"abcdefghij".repeat(4)}.railway.app`; // a 40-character first label
    expect(clean(`https://${longLabel}/a`)).toBe(`https://${longLabel}/a`);
    expect(scrubEvent({ transaction: "GET /v1/accounts" })?.transaction).toBe("GET /v1/accounts");
  });
});

describe("userinfo in URLs without a scheme", () => {
  it("drops userinfo from a protocol-relative breadcrumb URL", () => {
    const url = `//user:${"Pw!z9.".repeat(3)}@localhost:3000/p`;
    const out = scrubBreadcrumb({ category: "fetch", data: { url } });
    expect(out?.data?.url).toBe("/p");
  });
});

describe("scrubEvent field checks", () => {
  it("keeps the event type, environment and a numeric timestamp", () => {
    expect(
      scrubEvent({ type: "transaction", environment: "staging", timestamp: 1_763_546_400 }),
    ).toEqual({
      type: "transaction",
      environment: "staging",
      timestamp: 1_763_546_400,
    });
  });

  it("keeps message and logentry text after redacting it", () => {
    // The email and the pound amount are redacted; the rest of each string stays.
    const out = scrubEvent({
      message: "failed for a1@example.com",
      logentry: { message: "hit a1@example.com", formatted: "hit £5" },
    });
    expect(out?.message).toBe("failed for [redacted]");
    expect(out?.logentry).toEqual({ message: "hit [redacted]", formatted: "hit [redacted]" });
  });

  it("drops frame and mechanism fields of the wrong type", () => {
    // lineno and colno must be numbers and in_app and handled booleans; anything else could
    // carry free text, so it is dropped rather than copied.
    const out = scrubEvent({
      exception: {
        values: [
          {
            mechanism: { type: "generic", handled: "yes" },
            stacktrace: {
              frames: [{ function: "f", lineno: "12", colno: { a: 1 }, in_app: "true" }],
            },
          },
        ],
      },
    });
    expect(out?.exception?.values).toEqual([
      { mechanism: { type: "generic" }, stacktrace: { frames: [{ function: "f" }] } },
    ]);
  });

  it("keeps a scoped package folder in a stack frame path", () => {
    // A literal @ in a path segment is not an email; only the home directory goes.
    const out = scrubEvent({
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                { filename: "/Users/someone/proj/node_modules/@sentry/core/build/index.js" },
              ],
            },
          },
        ],
      },
    });
    const values = out?.exception?.values as { stacktrace: { frames: unknown[] } }[];
    expect(values[0]?.stacktrace.frames).toEqual([
      { filename: "node_modules/@sentry/core/build/index.js" },
    ]);
  });

  it("strips a file:// prefix from a frame path", () => {
    const out = scrubEvent({
      exception: {
        values: [{ stacktrace: { frames: [{ filename: "file:///app/dist/main.js" }] } }],
      },
    });
    const values = out?.exception?.values as { stacktrace: { frames: unknown[] } }[];
    expect(values[0]?.stacktrace.frames).toEqual([{ filename: "/app/dist/main.js" }]);
  });

  it("redacts a path segment holding a percent-encoded @", () => {
    // person%40localhost decodes to person@localhost: any encoded @ redacts the segment, even
    // without a dotted domain.
    expect(scrubEvent({ request: { url: "/u/person%40localhost/x" } })?.request?.url).toBe(
      "/u/[redacted]/x",
    );
  });

  it("drops a URL that only appears in a relative path's query", () => {
    expect(
      scrubEvent({ request: { url: "/callback?redirect=https://other.example/x" } })?.request?.url,
    ).toBe("/callback");
  });

  it("redacts a long token with a slash in a transaction name as one value", () => {
    // The token does not start with a scheme or a slash, so it is plain text, and 33 characters
    // of the base64 alphabet (the slash included) are one long-token match.
    const token = `${"abcdefghijklmnop"}/${"qrstuvwxyzABCDEF"}`;
    expect(scrubEvent({ transaction: `job ${token}` })?.transaction).toBe("job [redacted]");
  });
});

describe("scrubBreadcrumb method check", () => {
  it("drops a method that is not one upper-case word", () => {
    // "GET /x?token=ABC" starts and ends with capitals but is not only capitals.
    expect(
      scrubBreadcrumb({ category: "http", data: { method: "GET /x?token=ABC" } })?.data,
    ).toEqual({});
  });
});

describe("long values keep the whole parts before the cut", () => {
  it("cuts a long path back to the last forward slash", () => {
    // The path is "/" then 700 copies of "ab/" then "end": 2,104 characters. Character 2,048
    // (index 2,047) is the "a" of a copy, so the cut drops it and ends after 682 whole copies
    // (1 + 682 * 3 = 2,047 characters).
    const url = `/${"ab/".repeat(700)}end`;
    expect(scrubEvent({ request: { url } })?.request?.url).toBe(`/${"ab/".repeat(682)}`);
  });

  it("cuts a long Windows file path back to the last backslash", () => {
    // "C:" and a backslash are 3 characters, then 700 copies of "ab" and a backslash, then
    // "a.ts": 2,107 characters. Index 2,047 is a "b" and index 2,046 an "a", so the cut ends
    // after 681 whole copies (3 + 681 * 3 = 2,046 characters).
    const filename = `C:\\${"ab\\".repeat(700)}a.ts`;
    const out = scrubEvent({ exception: { values: [{ stacktrace: { frames: [{ filename }] } }] } });
    const values = out?.exception?.values as
      | Array<{ stacktrace?: { frames?: Array<{ filename?: string }> } }>
      | undefined;
    expect(values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe(`C:\\${"ab\\".repeat(681)}`);
  });

  it("keeps a full URL within 2,048 characters after its origin is added back", () => {
    // The path is cut to 2,047 characters as above; "https://h.test" adds 14, so the cleaned URL
    // would be 2,061 characters without the final cut.
    const url = `https://h.test/${"ab/".repeat(700)}end`;
    const out = scrubEvent({ request: { url } })?.request?.url ?? "";
    expect(out.startsWith("https://h.test/ab/ab/")).toBe(true);
    expect(out).toHaveLength(2048);
  });

  it("cuts a long transaction name back to the last whitespace", () => {
    // 3,000 copies of "ab " are 9,000 characters; the 8,192-character cut ends after 2,730
    // whole copies (8,190 characters), as in redactString.
    const out = scrubEvent({ transaction: "ab ".repeat(3000) })?.transaction;
    expect(out).toBe("ab ".repeat(2730));
  });
});
