// @vitest-environment node
import { existsSync } from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { securityTxtRouter } from "./ops";
import { buildSecurityTxt, normaliseSecurityContact } from "./security";

type Env = Record<string, string | undefined>;

const servers: { close: () => void }[] = [];

async function start(env: Env, now?: () => Date) {
  const app = express();
  app.use(securityTxtRouter(env, now));
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

describe("static security.txt", () => {
  it("is no longer shipped (a placeholder contact must never be served)", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    expect(existsSync(path.resolve(dir, "../public/.well-known/security.txt"))).toBe(false);
  });
});

describe("normaliseSecurityContact", () => {
  it.each([
    ["security@example.com", "mailto:security@example.com"],
    ["mailto:security@example.com", "mailto:security@example.com"],
    ["https://example.test/report", "https://example.test/report"],
    ["  https://example.test/report  ", "https://example.test/report"],
  ])("accepts %j", (input, expected) => {
    expect(normaliseSecurityContact(input)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "   ",
    "not a contact",
    "http://insecure.example",
    "javascript:alert(1)",
    "a@b.c\nPolicy: https://evil.example",
    "https://x.example/\r\nContact: mailto:evil@x.example",
  ])("rejects %j", (input) => {
    expect(normaliseSecurityContact(input)).toBeNull();
  });
});

describe("buildSecurityTxt", () => {
  const now = new Date("2026-11-12T10:00:00.000Z");
  const text = buildSecurityTxt("mailto:security@example.com", now);

  it("has the RFC 9116 fields", () => {
    expect(text).toMatch(/^Contact: mailto:security@example\.com$/m);
    expect(text).toMatch(/^Preferred-Languages: en$/m);
    expect(text).not.toMatch(/^(Policy|Canonical):/m);
    expect(text).not.toMatch(/example\.invalid|PLACEHOLDER/);
  });

  it("expires about a year after now, in RFC 3339 form", () => {
    const m = /^Expires: (.+)$/m.exec(text);
    expect(m?.[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    expect(m?.[1]).toBe("2027-11-12T10:00:00.000Z");
  });
});

describe("GET /.well-known/security.txt", () => {
  it("is a 404 (falls through, no body of ours) when SECURITY_CONTACT is unset", async () => {
    const base = await start({});
    const res = await fetch(`${base}/.well-known/security.txt`);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toMatch(/Contact:/);
  });

  it("is a 404 when SECURITY_CONTACT is invalid", async () => {
    const base = await start({ SECURITY_CONTACT: "nonsense" });
    expect((await fetch(`${base}/.well-known/security.txt`)).status).toBe(404);
  });

  it("serves text/plain with the contact when SECURITY_CONTACT is set", async () => {
    const base = await start(
      { SECURITY_CONTACT: "security@example.com" },
      () => new Date("2026-01-01T00:00:00.000Z"),
    );
    const res = await fetch(`${base}/.well-known/security.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    const body = await res.text();
    expect(body).toMatch(/^Contact: mailto:security@example\.com$/m);
    expect(body).toMatch(/^Expires: 2027-01-01T00:00:00\.000Z$/m);
  });
});
