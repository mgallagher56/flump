import { describe, expect, it } from "vitest";
import { redactDeep, redactString } from "./redact.js";
import { scrubBreadcrumb, scrubEvent } from "./scrub-event.js";

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

  it("redacts bigint, symbol and function values", () => {
    expect(redactDeep([10n, Symbol("s"), () => 1])).toEqual([
      "[redacted]",
      "[redacted]",
      "[redacted]",
    ]);
  });
});

describe("redactString performance", () => {
  const hostile: [string, string][] = [
    ["long letters", "a".repeat(200_000)],
    ["digits then x", `${"1".repeat(100_000)}x`],
    ["email-like", "a@".repeat(100_000)],
    ["jwt prefixes", "eyJ".repeat(60_000)],
    ["bearer spaces", `Bearer${" ".repeat(100_000)}`],
    ["question marks", "?".repeat(100_000)],
    ["decimals", "1.".repeat(100_000)],
  ];

  it.each(hostile)("finishes quickly on %s", (_label, input) => {
    const start = performance.now();
    redactString(input);
    expect(performance.now() - start).toBeLessThan(200);
  });

  it("truncates oversized input with a marker", () => {
    const out = redactString(`${"-".repeat(10)} ${" ".repeat(9000)}`);
    expect(out.endsWith("[truncated]")).toBe(true);
    expect(out.length).toBeLessThan(8300);
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
    sdk: { name: "sentry.javascript.node", version: "1.0.0", integrations: ["x"] },
    spans: [{ description: "secret" }],
    threads: { values: [] },
    fingerprint: ["x"],
    modules: { a: "1" },
    debug_meta: { images: [] },
    user: { id: "1" },
    request: { url: "https://x.test/users/bob@gmail.com/acct/12345678?x=1" },
    transaction: "GET /users/bob@gmail.com",
    contexts: { os: { name: "macOS", version: "14" } },
    tags: { route: "home" },
    message: "m",
    logentry: { message: "l" },
    exception: {
      values: [
        {
          type: "Error",
          value: "v",
          module: "leak",
          mechanism: {
            type: "generic",
            handled: true,
            description: "d bob@gmail.com",
            data: { a: 1 },
          },
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
    for (const key of Object.keys(out ?? {})) expect(ALLOWED_TOP_LEVEL.has(key)).toBe(true);
    for (const gone of ["spans", "threads", "fingerprint", "modules", "debug_meta", "user"]) {
      expect(out).not.toHaveProperty(gone);
    }
    expect(out).toMatchObject({
      event_id: "e1",
      level: "error",
      platform: "node",
      release: "abc1234",
    });
    expect(out?.sdk).toEqual({ name: "sentry.javascript.node", version: "1.0.0" });
  });

  it("scrubs url, transaction, exception fields and breadcrumbs", () => {
    const out = scrubEvent(structuredClone(dirty));
    expect(out?.request?.url).toBe("https://x.test/users/[redacted]/acct/[redacted]");
    expect(out?.transaction).toBe("GET /users/[redacted]");
    const [first, second] = (out?.exception?.values ?? []) as Record<string, unknown>[];
    expect(first).toEqual({
      type: "Error",
      value: "v",
      mechanism: { type: "generic", handled: true, description: "d [redacted]" },
      stacktrace: { frames: [{ lineno: 12, colno: 5 }] },
    });
    expect(second).toEqual({ type: "Error", mechanism: { type: "generic" } });
    expect(out?.breadcrumbs).toEqual([
      { category: "http", data: { url: "/a/[redacted]", method: "GET", status_code: 200 } },
    ]);
  });

  it("copes with malformed exception, stacktrace and breadcrumb shapes", () => {
    expect(scrubEvent({ exception: {} })?.exception).toEqual({ values: [] });
    expect(scrubEvent({ exception: { values: "nope" } })?.exception).toEqual({ values: [] });
    expect(scrubEvent({ exception: { values: [null, 3, {}] } })?.exception).toEqual({
      values: [{}],
    });
    expect(
      scrubEvent({ exception: { values: [{ stacktrace: { frames: "x" } }] } })?.exception,
    ).toEqual({ values: [{}] });
    expect(
      scrubEvent({ exception: { values: [{ stacktrace: { frames: [null, {}] } }] } })?.exception,
    ).toEqual({ values: [{ stacktrace: { frames: [{}] } }] });
    expect(scrubEvent({ breadcrumbs: { values: [] } })).not.toHaveProperty("breadcrumbs");
  });
});

describe("scrubEvent fail-closed", () => {
  it("returns null when input is not an object", () => {
    expect(scrubEvent(null as never)).toBeNull();
    expect(scrubEvent("x" as never)).toBeNull();
    expect(scrubBreadcrumb(null as never)).toBeNull();
  });

  it("returns null for a throwing getter in contexts", () => {
    const contexts = {
      os: {
        get name(): string {
          throw new Error("boom");
        },
      },
    };
    expect(scrubEvent({ contexts })).toBeNull();
  });

  it("returns null for a Proxy whose ownKeys throws", () => {
    const tags = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("boom");
        },
      },
    );
    expect(scrubEvent({ tags })).toBeNull();
  });

  it("does not throw on BigInt values and drops them", () => {
    const out = scrubEvent({ contexts: { os: { big: 10n } }, tags: { n: 10n } });
    expect(() => JSON.stringify(out)).not.toThrow();
    expect(out).toEqual({ contexts: { os: {} }, tags: {} });
  });

  it("returns null for a breadcrumb with a throwing getter", () => {
    const crumb = {
      category: "http",
      get data(): never {
        throw new Error("boom");
      },
    };
    expect(scrubBreadcrumb(crumb)).toBeNull();
  });
});

describe("scrubEvent field validation", () => {
  it("accepts only strings for release, environment, level, type and drops bad sdk", () => {
    const out = scrubEvent({
      release: 5,
      environment: { a: 1 },
      level: ["x"],
      type: 1,
      sdk: "x",
      timestamp: { a: 1 },
    });
    expect(out).toEqual({});
    expect(scrubEvent({ sdk: { name: 1, version: 2 } })?.sdk).toEqual({});
  });

  it("validates breadcrumb type, level, timestamp, method and status_code", () => {
    expect(
      scrubBreadcrumb({
        category: "http",
        type: 1 as never,
        level: {} as never,
        timestamp: Number.NaN,
        data: { method: "get /x?token=1", status_code: Number.NaN },
      }),
    ).toEqual({ category: "http", data: {} });
    expect(
      scrubBreadcrumb({ category: "http", data: { method: 5, status_code: "200" } })?.data,
    ).toEqual({});
  });

  it("redacts identifiers in breadcrumb paths", () => {
    const out = scrubBreadcrumb({
      category: "navigation",
      data: { from: "/u/bob@gmail.com", to: "https://a.test/acct/12345678" },
    });
    expect(out?.data).toEqual({ from: "/u/[redacted]", to: "/acct/[redacted]" });
  });

  it("strips userinfo from request.url and breadcrumb urls", () => {
    expect(scrubEvent({ request: { url: "https://bob:hunter2@a.test/p" } })?.request?.url).toBe(
      "https://a.test/p",
    );
    expect(
      scrubBreadcrumb({ category: "xhr", data: { url: "https://bob:hunter2@a.test/p" } })?.data,
    ).toEqual({
      url: "/p",
    });
  });
});

describe("scrubEvent contexts and tags", () => {
  it("keeps name and version of os, browser and runtime, redacts them elsewhere", () => {
    const out = scrubEvent({
      contexts: {
        os: { name: "macOS", version: "14.2", kernel_version: "23.1.0", hostname_value: "h" },
        browser: { name: "Chrome", version: "120" },
        runtime: { name: "node", version: "26.0.0" },
        device: { name: "bobs-laptop", model: "MacBookPro", arch: 5, simulator: true },
        app: { app_name: "flump" },
        culture: { locale: "en-GB" },
        trace: { op: "http" },
        custom: { name: "x" },
        weird: 5,
        browser2: "nope",
      },
    });
    expect(out?.contexts).toEqual({
      os: {
        name: "macOS",
        version: "14.2",
        kernel_version: "23.1.0",
        hostname_value: "[redacted]",
      },
      browser: { name: "Chrome", version: "120" },
      runtime: { name: "node", version: "26.0.0" },
      device: { name: "[redacted]", model: "MacBookPro" },
      app: { app_name: "[redacted]" },
      culture: { locale: "en-GB" },
      trace: { op: "http" },
    });
  });

  it("drops non-object contexts and tags, and number or object tag values", () => {
    expect(scrubEvent({ contexts: "x", tags: [1] as never })).toEqual({ tags: {} });
    expect(scrubEvent({ contexts: { os: "x" } })?.contexts).toEqual({});
    expect(scrubEvent({ tags: "x" })).toEqual({});
    expect(
      scrubEvent({ tags: { a: 1, b: { c: 1 }, route: "home", email_hint: "x" } })?.tags,
    ).toEqual({
      route: "home",
      email_hint: "[redacted]",
    });
  });

  it("reduces file paths to a repo-relative tail", () => {
    const frames = [
      { abs_path: "/Users/bob/work/flump/apps/backend/dist/main.js" },
      { filename: "/home/runner/app/dist/x.js" },
      { filename: "C:\\Users\\bob\\proj\\dist\\y.js" },
      { filename: "/app/node_modules/.bun/pkg@1/node_modules/pkg/index.js" },
      { filename: "file:///Users/bob/a/b.js" },
      { filename: "dist/main.js", module: "m", in_app: true },
    ];
    const out = scrubEvent({ exception: { values: [{ stacktrace: { frames } }] } });
    const got = (
      (out?.exception?.values ?? []) as { stacktrace: { frames: { filename: string }[] } }[]
    )[0]?.stacktrace.frames;
    expect(got?.map((f) => f.filename)).toEqual([
      "work/flump/apps/backend/dist/main.js",
      "app/dist/x.js",
      "proj\\dist\\y.js",
      "node_modules/pkg/index.js",
      "a/b.js",
      "dist/main.js",
    ]);
    expect(got?.[5]).toMatchObject({ module: "m", in_app: true });
  });
});
