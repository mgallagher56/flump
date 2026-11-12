import { describe, expect, it } from "vitest";
import { redactDeep } from "./redact.js";
import { scrubBreadcrumb, scrubEvent } from "./scrub-event.js";
import { assertSafeOptions } from "./sentry-options.js";

const ALLOWED_TOP_LEVEL = new Set([
  "event_id",
  "level",
  "platform",
  "timestamp",
  "release",
  "environment",
  "sdk",
  "type",
  "request",
  "contexts",
  "tags",
  "message",
  "transaction",
  "logentry",
  "exception",
  "breadcrumbs",
]);

describe("redactDeep graph safety", () => {
  it("terminates on a densely self-referencing graph", () => {
    const node: Record<string, unknown> = {};
    for (let i = 0; i < 8; i++) node[`k${i}`] = node;
    const start = Date.now();
    const out = redactDeep({ contexts: node }) as { contexts: Record<string, unknown> };
    expect(Date.now() - start).toBeLessThan(1000);
    expect(out.contexts.k0).toBe("[circular]");
  });

  it("marks shared references as circular rather than re-walking them", () => {
    const shared = { a: 1 };
    expect(redactDeep({ x: shared, y: shared })).toEqual({ x: { a: 1 }, y: "[circular]" });
  });

  it("caps the total node count", () => {
    const wide = Array.from({ length: 6000 }, () => ({}));
    const out = redactDeep(wide) as unknown[];
    expect(out[0]).toEqual({});
    expect(out[5999]).toBe("[redacted]");
  });
});

describe("redactDeep value types", () => {
  it("redacts non-integer and large numbers but keeps small integers", () => {
    expect(
      redactDeep([1.5, 1000, -2500, 999, 404, 0, Number.NaN, Number.POSITIVE_INFINITY]),
    ).toEqual([
      "[redacted]",
      "[redacted]",
      "[redacted]",
      999,
      404,
      0,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]);
  });

  it("converts errors and drops Map, Set and Date", () => {
    const out = redactDeep({
      err: new TypeError("failed for bob@gmail.com"),
      map: new Map([["a", 1]]),
      set: new Set([1]),
      when: new Date(0),
    });
    expect(out).toEqual({
      err: { name: "TypeError", message: "failed for [redacted]" },
      map: "[redacted]",
      set: "[redacted]",
      when: "[redacted]",
    });
  });
});

describe("scrubEvent allow-list", () => {
  const dirty = {
    event_id: "e1",
    level: "error",
    platform: "node",
    timestamp: 1,
    release: "abc1234",
    environment: "staging",
    sdk: { name: "sentry.javascript.node", version: "1.0.0" },
    type: undefined,
    spans: [{ description: "secret" }],
    threads: { values: [] },
    fingerprint: ["x"],
    modules: { a: "1" },
    debug_meta: { images: [] },
    user: { id: "1" },
    request: { url: "https://x.test/users/bob@gmail.com/acct/12345678?x=1" },
    transaction: "GET /users/bob@gmail.com",
    contexts: { os: { version: "14" } },
    tags: { route: "home" },
    message: "m",
    logentry: { message: "l" },
    exception: {
      values: [
        {
          type: "Error",
          value: "v",
          mechanism: { type: "generic", data: { email: "e", note: "ok" } },
          stacktrace: { frames: [{ lineno: 12, colno: 5, vars: { a: 1 } }] },
        },
        { type: "Error", mechanism: { type: "generic" } },
      ],
    },
    breadcrumbs: [
      { category: "console", message: "bob@gmail.com" },
      "junk",
      { category: "http", data: { url: "/a/12345678?q=1", method: "GET", status_code: 200 } },
    ],
  };

  it("emits only permitted top-level keys", () => {
    const out = scrubEvent(structuredClone(dirty));
    for (const key of Object.keys(out)) expect(ALLOWED_TOP_LEVEL.has(key)).toBe(true);
    for (const gone of ["spans", "threads", "fingerprint", "modules", "debug_meta", "user"]) {
      expect(out).not.toHaveProperty(gone);
    }
    expect(out).toMatchObject({
      event_id: "e1",
      level: "error",
      platform: "node",
      release: "abc1234",
    });
    expect(out.sdk).toEqual(dirty.sdk);
  });

  it("scrubs url, transaction, mechanism data and breadcrumbs", () => {
    const out = scrubEvent(structuredClone(dirty));
    expect(out.request?.url).toBe("https://x.test/users/[redacted]/acct/[redacted]");
    expect(out.transaction).toBe("GET /users/[redacted]");
    const [first, second] = out.exception?.values ?? [];
    expect(first?.mechanism).toEqual({
      type: "generic",
      data: { email: "[redacted]", note: "ok" },
    });
    expect(second?.mechanism).toEqual({ type: "generic" });
    expect(first?.stacktrace?.frames).toEqual([{ lineno: 12, colno: 5 }]);
    expect(out.breadcrumbs).toEqual([
      { category: "http", data: { url: "/a/[redacted]", method: "GET", status_code: 200 } },
    ]);
  });

  it("handles an exception without values", () => {
    expect(scrubEvent({ exception: {} }).exception).toEqual({ values: [] });
  });

  it("drops non-array breadcrumbs and handles a frameless stacktrace", () => {
    const out = scrubEvent({
      breadcrumbs: { values: [] },
      exception: { values: [{ stacktrace: {} }] },
    });
    expect(out).not.toHaveProperty("breadcrumbs");
    expect(out.exception).toEqual({ values: [{ stacktrace: {} }] });
  });
});

describe("scrubBreadcrumb field validation", () => {
  it("redacts identifiers in url, from and to paths", () => {
    const out = scrubBreadcrumb({
      category: "navigation",
      data: { from: "/u/bob@gmail.com", to: "https://a.test/acct/12345678" },
    });
    expect(out?.data).toEqual({ from: "/u/[redacted]", to: "/acct/[redacted]" });
  });

  it("drops invalid method and status_code", () => {
    const out = scrubBreadcrumb({
      category: "http",
      data: { method: "get /x?token=1", status_code: Number.NaN },
    });
    expect(out?.data).toEqual({});
    expect(
      scrubBreadcrumb({ category: "http", data: { method: 5, status_code: "200" } })?.data,
    ).toEqual({});
  });
});

describe("assertSafeOptions extra options", () => {
  const safe = { sendDefaultPii: false };
  it.each([{ tracesSampler: () => 1 }, { enableTracing: true }, { profilesSampleRate: 0.5 }])(
    "rejects %j",
    (extra) => {
      expect(() => assertSafeOptions({ ...safe, ...extra })).toThrow();
    },
  );

  it("accepts disabled variants", () => {
    expect(() =>
      assertSafeOptions({ ...safe, enableTracing: false, profilesSampleRate: 0 }),
    ).not.toThrow();
  });
});
