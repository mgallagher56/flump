// @vitest-environment node
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { accessLog, formatLine, normalisePath, resolveRequestId } from "./accessLog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("normalisePath", () => {
  it("drops the query string and fragment", () => {
    expect(normalisePath("/callback?code=abc123&state=xyz789")).toBe("/callback");
    expect(normalisePath("/callback#frag")).toBe("/callback");
  });

  it("collapses dynamic-looking segments to :id", () => {
    expect(normalisePath("/debts/42/edit")).toBe("/debts/:id/edit");
    expect(normalisePath("/a/123e4567-e89b-12d3-a456-426614174000")).toBe("/a/:id");
    expect(normalisePath("/t/abcdefghijklmnopqrstuvwxyz0123")).toBe("/t/:id");
    expect(normalisePath("/h/0123456789abcdef0123")).toBe("/h/:id");
  });

  it("keeps ordinary segments and the root", () => {
    expect(normalisePath("/")).toBe("/");
    expect(normalisePath("/debt/payoff")).toBe("/debt/payoff");
    expect(normalisePath("/__manifest?paths=/x")).toBe("/__manifest");
  });
});

describe("resolveRequestId", () => {
  it("keeps a valid inbound UUID", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(resolveRequestId({ "x-request-id": id })).toBe(id);
  });

  it("falls back to a strict-charset railway id", () => {
    expect(resolveRequestId({ "x-railway-request-id": "AbCd1234-_xyz" })).toBe("AbCd1234-_xyz");
  });

  it("replaces invalid ids", () => {
    for (const bad of [
      "not a uuid",
      "x\r\nSet-Cookie: a=b",
      "<script>",
      "short",
      "a".repeat(200),
    ]) {
      const id = resolveRequestId({ "x-request-id": bad, "x-railway-request-id": bad });
      expect(id).toMatch(UUID);
      expect(id).not.toBe(bad);
    }
  });

  it("generates a UUID when nothing is supplied", () => {
    expect(resolveRequestId({})).toMatch(UUID);
  });
});

describe("formatLine", () => {
  const entry = {
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    method: "GET",
    route: "/x",
    status: 200,
    durationMs: 1.5,
  };

  it("emits JSON in production shape", () => {
    expect(JSON.parse(formatLine(entry, true))).toMatchObject({
      context: "HttpAccess",
      method: "GET",
      route: "/x",
      status: 200,
    });
  });

  it("keeps the request id and scrubs the route", () => {
    expect(formatLine(entry, true)).toContain(entry.requestId);
    expect(formatLine({ ...entry, route: "/x?code=abc" }, false)).not.toContain("code=abc");
  });

  it("emits plain text in dev", () => {
    expect(formatLine(entry, false)).toBe(`GET /x 200 1.5ms ${entry.requestId}`);
  });
});

describe("accessLog middleware", () => {
  let server: ReturnType<typeof express.application.listen> | undefined;
  afterEach(() => server?.close());

  async function run(path: string, headers: Record<string, string> = {}, status = 200) {
    const lines: string[] = [];
    const app = express();
    app.use(accessLog({ json: true, write: (l) => lines.push(l) }));
    app.use((_req, res) => {
      res.status(status).send("ok");
    });
    server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    await response.text();
    await new Promise((r) => setTimeout(r, 20));
    return { lines, response };
  }

  it("never logs query values", async () => {
    const { lines } = await run("/callback?code=secretcode1&state=secretstate2&token=tok3");
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toMatch(/secretcode1|secretstate2|tok3|code=|state=|\?/);
    expect(JSON.parse(lines[0]).route).toBe("/callback");
  });

  it("echoes a valid request id and replaces an invalid one", async () => {
    const good = "123e4567-e89b-12d3-a456-426614174000";
    const a = await run("/x", { "x-request-id": good });
    expect(a.response.headers.get("x-request-id")).toBe(good);
    server?.close();
    const b = await run("/x", { "x-request-id": "bad id!" });
    expect(b.response.headers.get("x-request-id")).toMatch(UUID);
    expect(b.lines[0]).not.toContain("bad id");
  });

  it("stays quiet for successful health probes and assets, but logs failures", async () => {
    expect((await run("/healthz")).lines).toHaveLength(0);
    server?.close();
    expect((await run("/assets/app-abc.js")).lines).toHaveLength(0);
    server?.close();
    expect((await run("/healthz", {}, 503)).lines).toHaveLength(1);
  });
});
