// @vitest-environment node
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clientKey,
  extractReports,
  formatReportLine,
  handleCspReport,
  MAX_REPORT_BYTES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  ReportRateLimiter,
} from "~/security/csp-report.server";
import { securityMiddleware } from "~/security/middleware.server";
import { action } from "./csp-report";

const APP = "https://app.flump.test";
const QUERY_SECRET = "qs-value-9f3a";

const legacy = {
  "csp-report": {
    "document-uri": `${APP}/app/budget?token=${QUERY_SECRET}#frag`,
    "violated-directive": "script-src-elem",
    "effective-directive": "script-src-elem",
    "blocked-uri": `https://cdn.evil.test/path/x.js?k=${QUERY_SECRET}`,
    "original-policy": "default-src 'self'; script-src 'self' 'nonce-SECRETNONCE'",
    "script-sample": "alert(document.cookie)",
  },
};

function post(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request(`${APP}/csp-report`, {
    method: "POST",
    body,
    headers: {
      "content-type": "application/csp-report",
      "x-forwarded-for": "203.0.113.7",
      ...headers,
    },
  });
}

function fresh() {
  const lines: string[] = [];
  return {
    lines,
    deps: { limiter: new ReportRateLimiter(), log: (line: string) => lines.push(line) },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("handleCspReport", () => {
  it("answers 204 and logs only directive, blocked origin and document path (legacy report)", async () => {
    const { lines, deps } = fresh();
    const res = await handleCspReport(post(JSON.stringify(legacy)), deps);
    expect(res.status).toBe(204);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(lines).toEqual([
      JSON.stringify({
        level: "warn",
        context: "CspReport",
        directive: "script-src-elem",
        blocked: "https://cdn.evil.test",
        path: "/app/budget",
      }),
    ]);
  });

  it("never logs a query value, fragment, sample, policy or nonce", async () => {
    const { lines, deps } = fresh();
    await handleCspReport(post(JSON.stringify(legacy)), deps);
    const logged = lines.join("\n");
    for (const forbidden of [QUERY_SECRET, "frag", "alert(", "SECRETNONCE", "x.js", "token"]) {
      expect(logged).not.toContain(forbidden);
    }
  });

  it("accepts application/reports+json (Reporting API array)", async () => {
    const { lines, deps } = fresh();
    const body = [
      {
        type: "csp-violation",
        url: `${APP}/app`,
        body: {
          documentURL: `${APP}/app/tax?x=${QUERY_SECRET}`,
          effectiveDirective: "img-src",
          blockedURL: "data",
          sample: "secret",
        },
      },
      { type: "deprecation", body: { id: "x" } },
    ];
    const res = await handleCspReport(
      post(JSON.stringify(body), { "content-type": "application/reports+json" }),
      deps,
    );
    expect(res.status).toBe(204);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] as string)).toMatchObject({
      directive: "img-src",
      blocked: "data",
      path: "/app/tax",
    });
    expect(lines[0]).not.toContain(QUERY_SECRET);
  });

  it("answers 204 and logs nothing for invalid JSON, empty and non-report bodies", async () => {
    for (const body of ["{not json", "", "null", "42", '"str"', "[]", '{"a":1}']) {
      const { lines, deps } = fresh();
      const res = await handleCspReport(post(body), deps);
      expect(res.status, body).toBe(204);
      expect(lines, body).toEqual([]);
    }
  });

  it("answers 413 for a body over the cap, by Content-Length and by streamed size", async () => {
    const { lines, deps } = fresh();
    const big = JSON.stringify({ "csp-report": { "blocked-uri": "x".repeat(MAX_REPORT_BYTES) } });
    const declared = await handleCspReport(post(big), deps);
    expect(declared.status).toBe(413);

    const chunk = new TextEncoder().encode("x".repeat(1024));
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(chunk);
      },
    });
    const streamed = await handleCspReport(
      new Request(`${APP}/csp-report`, {
        method: "POST",
        body: stream,
        duplex: "half",
        headers: { "x-forwarded-for": "198.51.100.2" },
      } as RequestInit),
      deps,
    );
    expect(streamed.status).toBe(413);
    expect(lines).toEqual([]);
  });

  it("accepts a body exactly at the cap", async () => {
    const { deps } = fresh();
    const padding = " ".repeat(MAX_REPORT_BYTES - JSON.stringify(legacy).length);
    const res = await handleCspReport(post(JSON.stringify(legacy) + padding), deps);
    expect(res.status).toBe(204);
  });

  it("rate-limits per client: still 204, but nothing is logged after the limit", async () => {
    const { lines, deps } = fresh();
    const now = () => 1_000;
    for (let i = 0; i < RATE_LIMIT_MAX + 5; i++) {
      const res = await handleCspReport(post(JSON.stringify(legacy)), { ...deps, now });
      expect(res.status).toBe(204);
    }
    expect(lines).toHaveLength(RATE_LIMIT_MAX);

    const other = await handleCspReport(
      post(JSON.stringify(legacy), { "x-forwarded-for": "203.0.113.99" }),
      { ...deps, now },
    );
    expect(other.status).toBe(204);
    expect(lines).toHaveLength(RATE_LIMIT_MAX + 1);

    await handleCspReport(post(JSON.stringify(legacy)), {
      ...deps,
      now: () => 1_000 + RATE_LIMIT_WINDOW_MS,
    });
    expect(lines).toHaveLength(RATE_LIMIT_MAX + 2);
  });

  it("does not read the body of a rate-limited request", async () => {
    const limiter = new ReportRateLimiter(0);
    const request = post(JSON.stringify(legacy));
    const res = await handleCspReport(request, { limiter, log: () => undefined });
    expect(res.status).toBe(204);
    expect(request.bodyUsed).toBe(false);
  });
});

describe("clientKey", () => {
  it("uses the last X-Forwarded-For entry (the trusted proxy's), not a client-supplied one", () => {
    const request = post("{}", { "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.50" });
    expect(clientKey(request)).toBe("203.0.113.50");
  });

  it("falls back to one shared key without the header", () => {
    expect(clientKey(new Request(`${APP}/csp-report`, { method: "POST" }))).toBe("unknown");
  });
});

describe("ReportRateLimiter", () => {
  it("bounds the number of tracked clients", () => {
    const limiter = new ReportRateLimiter();
    for (let i = 0; i < 6000; i++) limiter.take(`ip-${i}`, i);
    expect(limiter.take("ip-0", 6001)).toBe(true);
  });
});

describe("extractReports / formatReportLine", () => {
  it("falls back to violated-directive and rejects hostile directive names", () => {
    const [report] = extractReports({
      "csp-report": { "violated-directive": "script-src 'self'", "blocked-uri": "inline" },
    });
    expect(report).toEqual({ directive: "script-src", blocked: "inline", path: "none" });
    const [hostile] = extractReports({
      "csp-report": { "effective-directive": "x\nINJECTED", "blocked-uri": "https://[bad" },
    });
    expect(hostile?.directive).toBe("unknown");
    expect(hostile?.blocked).toBe("invalid");
    expect(formatReportLine(hostile as never)).not.toContain("\n");
  });

  it("collapses opaque path segments and keeps data: URLs to the scheme", () => {
    const [report] = extractReports({
      "csp-report": {
        "effective-directive": "img-src",
        "blocked-uri": "data:image/png;base64,AAAA",
        "document-uri": `${APP}/app/accounts/0123456789abcdef0123456789abcdef`,
      },
    });
    expect(report).toEqual({ directive: "img-src", blocked: "data:", path: "/app/accounts/:id" });
  });
});

describe("route + CSRF middleware (E20-N1 interplay)", () => {
  function through(request: Request) {
    return securityMiddleware(
      { request, params: {}, context: new RouterContextProvider() } as never,
      () => action({ request, params: {}, context: new RouterContextProvider() } as never),
    ) as Promise<Response>;
  }

  it("passes a browser-style same-origin report (Sec-Fetch-Site: same-origin)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const res = await through(
      post(JSON.stringify(legacy), {
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": "192.0.2.1",
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("passes a report that only carries a same-origin Origin header", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const res = await through(
      post(JSON.stringify(legacy), { origin: APP, "x-forwarded-for": "192.0.2.2" }),
    );
    expect(res.status).toBe(204);
  });

  it("is NOT exempt from the CSRF rule: a cross-site or header-less POST is 403", async () => {
    const cross = await through(
      post(JSON.stringify(legacy), {
        "sec-fetch-site": "cross-site",
        "x-forwarded-for": "192.0.2.3",
      }),
    );
    expect(cross.status).toBe(403);
    const bare = await through(post(JSON.stringify(legacy), { "x-forwarded-for": "192.0.2.4" }));
    expect(bare.status).toBe(403);
  });

  it("works without a session cookie", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = post("{}", { "sec-fetch-site": "same-origin", "x-forwarded-for": "192.0.2.5" });
    expect(request.headers.get("cookie")).toBeNull();
    expect((await through(request)).status).toBe(204);
  });
});
