// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  buildCsp,
  genericServerError,
  injectThemeNonce,
  resolveAppUrl,
  THEME_MARKER,
} from "./security";

const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((d) => d.startsWith(`${name} `))
    ?.split(" ")
    .slice(1) ?? [];

describe("buildCsp", () => {
  const prod = buildCsp({ isProd: true, nonce: "abc123" });

  it("production script-src is 'self' plus the nonce only", () => {
    expect(directive(prod, "script-src")).toEqual(["'self'", "'nonce-abc123'"]);
  });

  it("production connect-src has no ws: and no blanket https:", () => {
    const connect = directive(prod, "connect-src");
    expect(connect).toEqual(["'self'"]);
    expect(prod).not.toMatch(/\bws:/);
  });

  it("production keeps the framing and base protections", () => {
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("upgrade-insecure-requests");
  });

  it("development keeps eval, inline scripts and websockets for Vite HMR", () => {
    const dev = buildCsp({ isProd: false });
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
  });
});

describe("resolveAppUrl", () => {
  it("prefers VITE_APP_URL, then APP_URL", () => {
    expect(resolveAppUrl({ VITE_APP_URL: "https://a.test", APP_URL: "https://b.test" })).toBe(
      "https://a.test",
    );
    expect(resolveAppUrl({ APP_URL: "https://b.test" })).toBe("https://b.test");
  });

  it("falls back to localhost outside production", () => {
    expect(resolveAppUrl({})).toBe("http://localhost:5173");
  });

  it("uses the Railway web URL on Railway, and the canonical app otherwise in production", () => {
    expect(
      resolveAppUrl({ NODE_ENV: "production", RAILWAY_PUBLIC_DOMAIN: "x.up.railway.app" }),
    ).toBe("https://web-production-845e6c.up.railway.app");
    expect(resolveAppUrl({ NODE_ENV: "production" })).toBe("https://app.flump.co.uk");
  });
});

describe("genericServerError", () => {
  it("returns a generic body and logs the error server-side only", () => {
    const log = vi.fn();
    const err = new Error("secret detail");
    const body = genericServerError(err, log);
    expect(body).toBe("Internal Server Error");
    expect(body).not.toContain("secret detail");
    expect(log).toHaveBeenCalledWith("Raw SSR Error:", err);
  });
});

describe("injectThemeNonce", () => {
  const index = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf-8");

  it("index.html contains the theme script marker exactly once", () => {
    expect(index.split(THEME_MARKER)).toHaveLength(2);
  });

  it("adds the nonce to the theme script and leaves no marker behind", () => {
    const html = injectThemeNonce(index, ' nonce="abc123"');
    expect(html).toContain('<script nonce="abc123">');
    expect(html).not.toContain("data-flump-theme");
  });

  it("emits a plain script tag with no nonce", () => {
    expect(injectThemeNonce(index, "")).toContain("<script>");
  });
});
