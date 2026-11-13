// @vitest-environment node
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyticsFlagWarning,
  analyticsMiddleware,
  createRateLimiter,
  isAnalyticsEnabled,
  isBot,
  referrerHost,
  routeKey,
} from "./analytics";

type Env = Record<string, string | undefined>;
const ON: Env = { ANALYTICS_MODE: "log", ANALYTICS_NOTICE_URL: "https://flump.example/cookies" };
const BROWSER = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const servers: { close: () => void }[] = [];

async function start(env: Env, allow?: () => boolean, status = 200) {
  const lines: string[] = [];
  let notify: () => void = () => {};
  const app = express();
  // A stand-in for sirv: serves assets before the middleware is reached.
  app.get("/assets/app.js", (_req, res) => res.type("js").send("x"));
  app.use(
    analyticsMiddleware(
      env,
      (l) => {
        lines.push(l);
        notify();
      },
      () => new Date("2026-11-13T23:59:59Z"),
      allow,
    ),
  );
  app.use((_req, res) => res.status(status).type("html").end("<html>spa</html>"));
  const server = await new Promise<import("node:http").Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  servers.push(server);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const nextLine = () => new Promise<void>((r) => (notify = r));
  return { base, lines, nextLine };
}

const nav = (extra: Record<string, string> = {}) => ({
  headers: { accept: "text/html,application/xhtml+xml", "user-agent": BROWSER, ...extra },
});
// Negative cases: nothing is emitted, so wait one macrotask after the response has been read.
const settle = () => new Promise((r) => setImmediate(r));

afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

describe("analytics gate", () => {
  it("needs both env vars", () => {
    expect(isAnalyticsEnabled(ON)).toBe(true);
    expect(isAnalyticsEnabled({ ANALYTICS_MODE: "log" })).toBe(false);
    expect(isAnalyticsEnabled({ ANALYTICS_NOTICE_URL: ON.ANALYTICS_NOTICE_URL })).toBe(false);
    expect(isAnalyticsEnabled({ ...ON, ANALYTICS_MODE: "LOG" })).toBe(false);
    expect(isAnalyticsEnabled({ ...ON, ANALYTICS_NOTICE_URL: "http://x.example" })).toBe(false);
    expect(isAnalyticsEnabled({ ...ON, ANALYTICS_NOTICE_URL: "not a url" })).toBe(false);
  });

  it("warns on a half-set gate only", () => {
    expect(analyticsFlagWarning({})).toBeUndefined();
    expect(analyticsFlagWarning(ON)).toBeUndefined();
    expect(analyticsFlagWarning({ ANALYTICS_MODE: "log" })).toMatch(/stays OFF/);
  });
});

describe("helpers", () => {
  it("maps paths to allow-listed keys", () => {
    expect(routeKey("/")).toBe("/");
    expect(routeKey("/pricing?utm=1")).toBe("/pricing");
    expect(routeKey("/tools/uk-100k-tax-trap-calculator")).toBe(
      "/tools/uk-100k-tax-trap-calculator",
    );
    expect(routeKey("/tools/secret-user-slug")).toBe("other");
    expect(routeKey("/random?email=a@b.c")).toBe("other");
  });

  it("keeps only the referrer host", () => {
    expect(referrerHost("https://News.Example.com:8443/a/b?q=secret#x")).toBe("news.example.com");
    expect(referrerHost("https://me.example/page", "me.example:3001")).toBeNull();
    expect(referrerHost("android-app://com.x")).toBeNull();
    expect(referrerHost("garbage")).toBeNull();
    expect(referrerHost(undefined)).toBeNull();
  });

  it("detects bots", () => {
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("curl/8.0")).toBe(true);
    expect(isBot(undefined)).toBe(true);
    expect(isBot(BROWSER)).toBe(false);
  });
});

describe("analyticsMiddleware", () => {
  it("logs one pageview line with no IP, user agent, query or cookie", async () => {
    const { base, lines, nextLine } = await start(ON);
    const got = nextLine();
    const res = await fetch(
      `${base}/pricing?email=a@b.c`,
      nav({ referer: "https://news.example/x?y=1" }),
    );
    await res.text();
    await got;
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] as string)).toEqual({
      type: "pageview",
      key: "/pricing",
      ref: "news.example",
      day: "2026-11-13",
    });
    expect(lines[0]).not.toMatch(/127\.0\.0\.1|Mozilla|a@b\.c|secret/);
  });

  it("maps an unknown path to other", async () => {
    const { base, lines, nextLine } = await start(ON);
    const got = nextLine();
    await (await fetch(`${base}/nope/123`, nav())).text();
    await got;
    expect(JSON.parse(lines[0] as string).key).toBe("other");
  });

  it("is disabled when either env var is missing", async () => {
    for (const env of [
      { ANALYTICS_MODE: "log" },
      { ANALYTICS_NOTICE_URL: "https://x.example" },
      {},
    ]) {
      const { base, lines } = await start(env);
      const res = await fetch(`${base}/`, nav());
      await res.text();
      await settle();
      expect(lines).toHaveLength(0);
    }
  });

  it("does not count assets, non-GET, non-HTML or bots", async () => {
    const { base, lines } = await start(ON);
    await (await fetch(`${base}/assets/app.js`, nav())).text();
    await (await fetch(`${base}/`, { method: "POST", ...nav() })).text();
    await (
      await fetch(`${base}/`, { headers: { accept: "application/json", "user-agent": BROWSER } })
    ).text();
    await (await fetch(`${base}/`, nav({ "user-agent": "Googlebot/2.1" }))).text();
    await settle();
    expect(lines).toHaveLength(0);
  });

  it("skips HEAD and prefetch/prerender requests", async () => {
    const { base, lines } = await start(ON);
    await fetch(`${base}/`, { method: "HEAD", ...nav() });
    await (await fetch(`${base}/`, nav({ "sec-purpose": "prefetch" }))).text();
    await (await fetch(`${base}/`, nav({ "sec-purpose": "prefetch;prerender" }))).text();
    await settle();
    expect(lines).toHaveLength(0);
  });

  it("does not log redirects or 5xx, and logs a 404 as other", async () => {
    for (const status of [301, 302, 400, 500]) {
      const { base, lines } = await start(ON, undefined, status);
      await (await fetch(`${base}/pricing`, { redirect: "manual", ...nav() })).text();
      await settle();
      expect(lines).toHaveLength(0);
    }
    const { base, lines, nextLine } = await start(ON, undefined, 404);
    const got = nextLine();
    await (await fetch(`${base}/pricing`, nav())).text();
    await got;
    expect(JSON.parse(lines[0] as string).key).toBe("other");
  });

  it("drops lines over the global rate cap", async () => {
    const { base, lines } = await start(
      ON,
      createRateLimiter(2, () => 0),
    );
    for (let i = 0; i < 4; i++) await (await fetch(`${base}/`, nav())).text();
    await settle();
    expect(lines).toHaveLength(2);
  });

  it("neutralises CRLF in the referer", async () => {
    const { base, lines, nextLine } = await start(ON);
    const got = nextLine();
    // fetch rejects raw CRLF headers, so exercise the parser directly as well.
    await (
      await fetch(`${base}/`, nav({ referer: "https://ok.example/%0d%0aSet-Cookie:x" }))
    ).text();
    await got;
    expect(lines[0]).not.toMatch(/\\r|\\n.*Set-Cookie|Set-Cookie/);
    expect(referrerHost("https://evil.example\r\nX: y/path")).toBeNull();
    expect(referrerHost('https://a.example/\r\n{"type":"pageview"}')).toBe("a.example");
  });
});

describe("rate limiter and referrer limits", () => {
  it("refills over time", () => {
    let t = 0;
    const allow = createRateLimiter(2, () => t);
    expect([allow(), allow(), allow()]).toEqual([true, true, false]);
    t = 1000;
    expect(allow()).toBe(true);
  });

  it("drops IP literals and overlong hosts", () => {
    expect(referrerHost("http://192.168.1.1/x")).toBeNull();
    expect(referrerHost("http://[2001:db8::1]/x")).toBeNull();
    expect(referrerHost(`https://${"a".repeat(254)}.com/`)).toBeNull();
  });
});
