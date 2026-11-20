// @vitest-environment node
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { redirectMiddleware, redirectTarget } from "./redirects";

const servers: { close: () => void }[] = [];

/** The middleware in front of a stand-in SSR handler, as server.ts mounts it. */
async function start() {
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });
  app.use(redirectMiddleware());
  app.use((_req, res) => {
    res.status(200).type("html").end("<html>page</html>");
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

describe("redirectTarget", () => {
  it.each(["/mcp", "/mcp/", "/MCP", "/Mcp//", "//mcp", "/mcp?utm=1", "/mcp#setup", "/%6Dcp"])(
    "sends %s to the AI connection page",
    (url) => {
      expect(redirectTarget(url)).toBe("/features/ai-connection");
    },
  );

  it.each([
    "/",
    "/features/ai-connection",
    "/mcp/setup",
    "/mcpx",
    "/pricing",
    "/tools",
    "/%E0%A4%A",
    "//evil.example/mcp",
  ])("leaves %s alone", (url) => {
    expect(redirectTarget(url)).toBeUndefined();
  });
});

describe("redirectMiddleware", () => {
  it("answers /mcp with a 301 to /features/ai-connection, keeping the query and the headers", async () => {
    const base = await start();
    const res = await fetch(`${base}/mcp?ref=app`, { redirect: "manual" });
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/features/ai-connection?ref=app");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000");
  });

  it("answers a HEAD request the same way", async () => {
    const base = await start();
    const res = await fetch(`${base}/MCP/`, { method: "HEAD", redirect: "manual" });
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/features/ai-connection");
  });

  it("passes other methods and other paths through", async () => {
    const base = await start();
    expect((await fetch(`${base}/mcp`, { method: "POST", redirect: "manual" })).status).toBe(200);
    expect((await fetch(`${base}/pricing`, { redirect: "manual" })).status).toBe(200);
  });
});

describe("server.ts", () => {
  it("mounts the redirects after the security headers and ops routes, before analytics and SSR", () => {
    const source = readFileSync(fileURLToPath(new URL("../server.ts", import.meta.url)), "utf8");
    const at = (needle: string) => {
      const index = source.indexOf(needle);
      expect(index, needle).toBeGreaterThan(-1);
      return index;
    };
    const headers = at('res.setHeader("Strict-Transport-Security"');
    const ops = at("registerOps(app);");
    const redirects = at("app.use(redirectMiddleware());");
    const analytics = at("app.use(analyticsMiddleware());");
    const ssr = at("app.use(async (req, res) => {");
    expect(headers).toBeLessThan(ops);
    expect(ops).toBeLessThan(redirects);
    expect(redirects).toBeLessThan(analytics);
    expect(analytics).toBeLessThan(ssr);
  });
});
