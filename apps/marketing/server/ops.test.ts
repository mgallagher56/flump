// @vitest-environment node
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { noindexMiddleware, opsRouter } from "./ops";
import { sitemapRouter } from "./sitemap";

type Env = Record<string, string | undefined>;

const servers: { close: () => void }[] = [];

async function start(env: Env) {
  const app = express();
  app.use(noindexMiddleware(env));
  app.use(opsRouter(env));
  app.use(sitemapRouter(env));
  app.use((_req, res) => {
    res.status(200).type("html").end("<html>spa</html>");
  });
  const server = await new Promise<import("node:http").Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

describe("ops routes", () => {
  it("serves /healthz as 200 JSON with no-store", async () => {
    const base = await start({});
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("serves a disallow-all /robots.txt by default", async () => {
    const base = await start({});
    const res = await fetch(`${base}/robots.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("serves an allow-all /robots.txt when ALLOW_INDEXING=true", async () => {
    const base = await start({ ALLOW_INDEXING: "true", FLUMP_LAUNCH: "true" });
    const res = await fetch(`${base}/robots.txt`);
    expect(await res.text()).toBe("User-agent: *\nAllow: /\n");
  });

  it("adds a Sitemap line to robots.txt only when indexing is on and SITE_URL is https", async () => {
    const on = await start({
      ALLOW_INDEXING: "true",
      FLUMP_LAUNCH: "true",
      SITE_URL: "https://flump.example/x",
    });
    expect(await (await fetch(`${on}/robots.txt`)).text()).toBe(
      "User-agent: *\nAllow: /\nSitemap: https://flump.example/sitemap.xml\n",
    );
    const bad = await start({
      ALLOW_INDEXING: "true",
      FLUMP_LAUNCH: "true",
      SITE_URL: "http://flump.example",
    });
    expect(await (await fetch(`${bad}/robots.txt`)).text()).toBe("User-agent: *\nAllow: /\n");
    const off = await start({ SITE_URL: "https://flump.example" });
    expect(await (await fetch(`${off}/robots.txt`)).text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("keeps disallow for ALLOW_INDEXING=1 and TRUE", async () => {
    for (const v of ["1", "TRUE"]) {
      const base = await start({ ALLOW_INDEXING: v });
      expect(await (await fetch(`${base}/robots.txt`)).text()).toBe("User-agent: *\nDisallow: /\n");
    }
  });
});

describe("indexing flag combinations", () => {
  const cases: [string, Env, boolean][] = [
    ["neither", {}, false],
    ["ALLOW_INDEXING only", { ALLOW_INDEXING: "true" }, false],
    ["FLUMP_LAUNCH only", { FLUMP_LAUNCH: "true" }, false],
    ["both", { ALLOW_INDEXING: "true", FLUMP_LAUNCH: "true" }, true],
  ];
  for (const [name, env, allowed] of cases) {
    it(`${name}: indexing ${allowed ? "allowed" : "blocked"}`, async () => {
      const base = await start({ ...env, SITE_URL: "https://flump.example" });
      const robots = await (await fetch(`${base}/robots.txt`)).text();
      expect(
        robots.startsWith(allowed ? "User-agent: *\nAllow: /" : "User-agent: *\nDisallow: /"),
      ).toBe(true);
      expect((await fetch(`${base}/x`)).headers.has("x-robots-tag")).toBe(!allowed);
      expect((await fetch(`${base}/sitemap.xml`)).status).toBe(allowed ? 200 : 404);
    });
  }
});

describe("noindexMiddleware", () => {
  it("adds X-Robots-Tag to ops routes and catch-all by default", async () => {
    const base = await start({});
    for (const path of ["/healthz", "/robots.txt", "/some/arbitrary/path"]) {
      const res = await fetch(`${base}${path}`);
      expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
  });

  it("omits the header when ALLOW_INDEXING=true", async () => {
    const base = await start({ ALLOW_INDEXING: "true", FLUMP_LAUNCH: "true" });
    for (const path of ["/healthz", "/anything"]) {
      expect((await fetch(`${base}${path}`)).headers.has("x-robots-tag")).toBe(false);
    }
  });

  it("keeps the header for ALLOW_INDEXING=1 and TRUE", async () => {
    for (const v of ["1", "TRUE"]) {
      const base = await start({ ALLOW_INDEXING: v });
      expect((await fetch(`${base}/x`)).headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
  });
});

describe("server.ts wiring", () => {
  const source = readFileSync(fileURLToPath(new URL("../server.ts", import.meta.url)), "utf-8");

  it("mounts ops before vite middlewares, sirv and the SPA catch-all", () => {
    const ops = source.indexOf("registerOps(app)");
    expect(ops).toBeGreaterThan(-1);
    for (const marker of [
      "app.use(vite.middlewares",
      'import("sirv")',
      "app.use(async (req, res)",
    ]) {
      const idx = source.indexOf(marker);
      expect(idx, marker).toBeGreaterThan(-1);
      expect(ops, marker).toBeLessThan(idx);
    }
  });

  it("mounts ops after the security headers middleware so ops responses get them", () => {
    const ops = source.indexOf("registerOps(app)");
    for (const marker of [
      "Strict-Transport-Security",
      "Content-Security-Policy",
      "X-Content-Type-Options",
    ]) {
      const idx = source.indexOf(marker);
      expect(idx, marker).toBeGreaterThan(-1);
      expect(idx, marker).toBeLessThan(ops);
    }
  });

  it("builds head meta through buildHeadMeta", () => {
    expect(source).toContain("buildHeadMeta({");
  });

  it("404s /sitemap.xml unless indexing is on and SITE_URL is https", async () => {
    for (const env of [
      {},
      { ALLOW_INDEXING: "true", FLUMP_LAUNCH: "true" },
      { ALLOW_INDEXING: "true", SITE_URL: "https://flump.example" },
      { FLUMP_LAUNCH: "true", SITE_URL: "https://flump.example" },
      { SITE_URL: "https://flump.example" },
      { ALLOW_INDEXING: "true", FLUMP_LAUNCH: "true", SITE_URL: "http://flump.example" },
    ]) {
      const base = await start(env);
      expect((await fetch(`${base}/sitemap.xml`)).status).toBe(404);
    }
  });

  it("serves a generated /sitemap.xml with every canonical page", async () => {
    const base = await start({
      ALLOW_INDEXING: "true",
      FLUMP_LAUNCH: "true",
      SITE_URL: "https://flump.example/x",
    });
    const res = await fetch(`${base}/sitemap.xml`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("xml");
    const body = await res.text();
    expect(body).toContain("<loc>https://flump.example/</loc>");
    expect(body).toContain("<loc>https://flump.example/pricing</loc>");
    expect(body).toContain("<loc>https://flump.example/tools/uk-100k-tax-trap-calculator</loc>");
    expect(body).not.toContain("overdraft-interest-calculator");
  });
});
