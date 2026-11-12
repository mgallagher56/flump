// @vitest-environment node
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const file = path.join(publicDir, ".well-known/security.txt");

describe("security.txt", () => {
  const text = fs.readFileSync(file, "utf8");

  it("has the RFC 9116 required fields and a placeholder contact", () => {
    expect(text).toMatch(/^Contact: mailto:security@example\.invalid$/m);
    expect(text).toMatch(/PLACEHOLDER/);
    expect(text).toMatch(/^Policy: https:\/\//m);
    expect(text).toMatch(/^Preferred-Languages: en$/m);
  });

  it("expires in the future but within about a year, in RFC 3339 form", () => {
    const m = /^Expires: (.+)$/m.exec(text);
    expect(m).not.toBeNull();
    expect(m?.[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    const ms = Date.parse(m?.[1] ?? "") - Date.now();
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThan(366 * 24 * 3600 * 1000);
  });

  it("is served as text/plain by the production static handler config", async () => {
    // server.ts mounts sirv with dotfiles: true so /.well-known is reachable.
    const handler = sirv(publicDir, { dotfiles: true, extensions: [] });
    const server = http.createServer((req, res) =>
      handler(req, res, () => {
        res.end("miss");
      }),
    );
    await new Promise<void>((r) => server.listen(0, r));
    const { port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/.well-known/security.txt`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    } finally {
      server.close();
    }
  });
});
