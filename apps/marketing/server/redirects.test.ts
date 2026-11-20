// @vitest-environment node
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { TOOL_SLUG_ALIASES, TOOL_SLUGS } from "@repo/ui/tools";
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

  it.each(["/tools", "/tools/", "/TOOLS"])("sends %s to the features page", (url) => {
    expect(redirectTarget(url)).toBe("/features");
  });

  // Written out by hand (plan section 4.4), so the table cannot pass by agreeing with itself.
  const PAY = "/features/pay";
  const DEBT = "/features/debt-and-borrowing";
  it.each([
    // The eight canonical slugs.
    ["uk-pay-rise-take-home-calculator", PAY],
    ["uk-student-loan-overpay-or-invest-calculator", PAY],
    ["section-24-landlord-tax-calculator", PAY],
    ["uk-100k-tax-trap-calculator", PAY],
    ["uk-debt-snowball-vs-avalanche-calculator", DEBT],
    ["0-percent-balance-transfer-payoff-calculator", DEBT],
    ["overdraft-cost-and-payoff-calculator", DEBT],
    ["mortgage-overpayment-vs-isa-calculator", DEBT],
    // Every alias, to its canonical slug's page.
    ["mortgage-overpay-vs-isa", DEBT],
    ["section-24-landlord-calculator", PAY],
    ["mortgage-overpay-vs-isa-calculator", DEBT],
    ["zero-percent-balance-transfer-calculator", DEBT],
    ["landlord-section-24-tax-calculator", PAY],
    ["overdraft-interest-calculator", DEBT],
    ["student-loan-plan-2-calculator", PAY],
  ])("sends /tools/%s to %s", (slug, target) => {
    expect(redirectTarget(`/tools/${slug}`)).toBe(target);
    expect(redirectTarget(`/tools/${slug.toUpperCase()}/`)).toBe(target);
  });

  it("covers every catalogue slug and alias, so none can answer 404", () => {
    for (const slug of [...TOOL_SLUGS, ...Object.keys(TOOL_SLUG_ALIASES)]) {
      expect(redirectTarget(`/tools/${slug}`), slug).toMatch(/^\/features\//);
    }
  });

  it.each([
    "/",
    "/features/ai-connection",
    "/mcp/setup",
    "/mcpx",
    "/pricing",
    "/tools/nope",
    "/tools/uk-pay-rise-take-home-calculator/extra",
    "/%E0%A4%A",
    "//evil.example/mcp",
  ])("leaves %s alone", (url) => {
    expect(redirectTarget(url)).toBeUndefined();
  });
});

describe("redirectMiddleware", () => {
  it("answers /mcp with a 301 to /features/ai-connection, with the headers and without the query", async () => {
    const base = await start();
    const res = await fetch(`${base}/mcp?ref=app`, { redirect: "manual" });
    expect(res.status).toBe(301);
    // The target comes from the table alone, never from the request.
    expect(res.headers.get("location")).toBe("/features/ai-connection");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000");
  });

  it("answers a HEAD request the same way", async () => {
    const base = await start();
    const res = await fetch(`${base}/MCP/`, { method: "HEAD", redirect: "manual" });
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/features/ai-connection");
  });

  it("answers a former calculator page with a 301 to its area page", async () => {
    const base = await start();
    const res = await fetch(`${base}/tools/overdraft-interest-calculator?x=1`, {
      redirect: "manual",
    });
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/features/debt-and-borrowing");
    expect((await fetch(`${base}/tools/nope`, { redirect: "manual" })).status).toBe(200);
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
