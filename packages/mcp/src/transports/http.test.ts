import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { describe, expect, it, vi } from "vitest";
import { FailedAuthLimiter } from "../auth/failed-auth-limiter.js";
import { hashPatToken } from "../auth/token-verifier.js";
import { createFakeImports, SEEDED_BATCH_ID } from "../testing/fake-imports.js";
import type { McpUserDataProvider } from "../types.js";
import { countToolCalls, HttpMcpHandler, MAX_BATCH_COUNTED, MAX_BODY_BYTES } from "./http.js";

const newHandler = () => new HttpMcpHandler({ dataProvider: {} as McpUserDataProvider });
const PAT = "flump_pat_0123456789abcdef0123456789abcdef";
const unsignedJwt = `eyJhbGciOiJub25lIn0.${Buffer.from('{"sub":"x"}').toString("base64")}.sig`;

const headers: Array<[string, string | undefined]> = [
  ["missing Authorization", undefined],
  ["malformed Authorization", "Basic abc"],
  ["mock-session-token", "Bearer mock-session-token"],
  ["mock_mcp_x", "Bearer mock_mcp_x"],
  ["unsigned JWT", `Bearer ${unsignedJwt}`],
  ["PAT with no store", `Bearer ${PAT}`],
];

describe("HttpMcpHandler auth failures", () => {
  for (const [name, header] of headers) {
    it(`web request: ${name} is 401`, async () => {
      const handler = newHandler();
      const req = new Request("http://localhost/mcp", {
        method: "POST",
        headers: header ? { authorization: header } : {},
      });
      const res = await handler.handleWebRequest(req);
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toMatch(/^Bearer/);
    });

    it(`express request: ${name} is 401`, async () => {
      const handler = newHandler();
      let status = 0;
      const res: any = {
        status(code: number) {
          status = code;
          return this;
        },
        setHeader() {
          return this;
        },
        json() {
          return this;
        },
      };
      await handler.handleExpressRequest({ headers: header ? { authorization: header } : {} }, res);
      expect(status).toBe(401);
    });
  }
});

describe("HttpMcpHandler hardening", () => {
  const webReq = (auth: string, ip = "9.9.9.9") =>
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: { authorization: auth, "x-forwarded-for": ip },
    });

  it("accepts a lower-case bearer scheme as a well-formed header (fails on the token, not the scheme)", async () => {
    const res = await newHandler().handleWebRequest(webReq("bearer mock-session-token"));
    const body = await res.json();
    expect(body.message).not.toMatch(/malformed/i);
  });

  it("returns 429 with Retry-After on the 11th failed attempt from one IP", async () => {
    const h = new HttpMcpHandler({
      dataProvider: {} as McpUserDataProvider,
      failedAuthLimiter: new FailedAuthLimiter(10, 60_000),
    });
    for (let i = 0; i < 10; i++) {
      expect((await h.handleWebRequest(webReq(`Bearer ${PAT}`))).status).toBe(401);
    }
    const res = await h.handleWebRequest(webReq(`Bearer ${PAT}`));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    // another IP is unaffected
    expect((await h.handleWebRequest(webReq(`Bearer ${PAT}`, "8.8.8.8"))).status).toBe(401);
  });

  it("express: 11th failure is 429 with Retry-After", async () => {
    const h = new HttpMcpHandler({ dataProvider: {} as McpUserDataProvider });
    const call = async () => {
      const out: { status: number; headers: Record<string, string> } = { status: 0, headers: {} };
      const res: any = {
        status(c: number) {
          out.status = c;
          return this;
        },
        setHeader(k: string, v: string) {
          out.headers[k.toLowerCase()] = v;
          return this;
        },
        json() {
          return this;
        },
      };
      await h.handleExpressRequest(
        { ip: "7.7.7.7", headers: { authorization: `Bearer ${PAT}` } },
        res,
      );
      return out;
    };
    for (let i = 0; i < 10; i++) expect((await call()).status).toBe(401);
    const last = await call();
    expect(last.status).toBe(429);
    expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("non-auth errors return a generic 400 with no err.message", async () => {
    const h = new HttpMcpHandler({ dataProvider: {} as McpUserDataProvider });
    (h as any).verifier = {
      verifyAuthorizationHeader: async () => {
        throw new Error("internal db password=hunter2");
      },
    };
    const res = await h.handleWebRequest(webReq(`Bearer ${PAT}`));
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain("hunter2");

    let sent: any;
    const eres: any = {
      status() {
        return this;
      },
      setHeader() {
        return this;
      },
      json(b: unknown) {
        sent = b;
        return this;
      },
    };
    await h.handleExpressRequest({ headers: {} }, eres);
    expect(JSON.stringify(sent)).not.toContain("hunter2");
  });

  it("clears the IP's failure count after a successful authentication (web)", async () => {
    const limiter = new FailedAuthLimiter(2, 60_000);
    const handler = new HttpMcpHandler({
      dataProvider: {} as McpUserDataProvider,
      devToken: "dev-secret",
      failedAuthLimiter: limiter,
      rateLimiter: {
        checkLimit: () => ({ allowed: false, resetSeconds: 1, message: "x" }),
      } as never,
    });
    await limiter.recordFailure("7.7.7.7");
    const res = await handler.handleWebRequest(webReq("Bearer dev-secret", "7.7.7.7"));
    expect(res.status).toBe(429);
    await limiter.recordFailure("7.7.7.7");
    expect((await limiter.check("7.7.7.7")).blocked).toBe(false);
  });

  it("clears the IP's failure count after a successful authentication (express)", async () => {
    const limiter = new FailedAuthLimiter(2, 60_000);
    const handler = new HttpMcpHandler({
      dataProvider: {} as McpUserDataProvider,
      devToken: "dev-secret",
      failedAuthLimiter: limiter,
      rateLimiter: {
        checkLimit: () => ({ allowed: false, resetSeconds: 1, message: "x" }),
      } as never,
    });
    await limiter.recordFailure("7.7.7.8");
    const res: any = { status: () => res, setHeader: () => res, json: () => res };
    await handler.handleExpressRequest(
      { ip: "7.7.7.8", headers: { authorization: "Bearer dev-secret" } },
      res,
    );
    await limiter.recordFailure("7.7.7.8");
    expect((await limiter.check("7.7.7.8")).blocked).toBe(false);
  });
});

describe("usage counted per tools/call", () => {
  const record = (id: string) => ({
    id,
    userId: "user-1",
    tokenHash: hashPatToken(PAT),
    scopes: ["mcp:read:anonymized"],
    anonymizeInstitutions: true,
    expiresAt: null,
    revokedAt: null,
  });
  const setup = (allowed: boolean) => {
    const calls: Array<[string, number]> = [];
    const keys: string[] = [];
    const handler = new HttpMcpHandler({
      dataProvider: {} as McpUserDataProvider,
      devToken: "dev-secret",
      tokenStore: {
        findTokenByHash: async () => record("tok-1"),
        recordRequest: async (id, n) => {
          calls.push([id, n]);
        },
      },
      rateLimiter: {
        checkLimit: (key: string) => {
          keys.push(key);
          return { allowed, resetSeconds: 1, message: "x" };
        },
      } as never,
    });
    return { handler, calls, keys };
  };
  const rpc = (method: string, id = 1) => ({ jsonrpc: "2.0", id, method, params: {} });
  const init = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "t", version: "1" },
    },
  };
  const webReq = (body: string | unknown, extra: Record<string, string> = {}, auth = PAT) =>
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...extra,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  const expressRes: any = {
    status: () => expressRes,
    setHeader: () => expressRes,
    json: () => expressRes,
  };
  const expressReq = (body: unknown) => ({ headers: { authorization: `Bearer ${PAT}` }, body });

  it("countToolCalls handles single, batch and junk bodies", () => {
    expect(countToolCalls(rpc("tools/call"))).toBe(1);
    expect(countToolCalls([rpc("tools/call"), rpc("tools/list", 2), rpc("tools/call", 3)])).toBe(2);
    expect(countToolCalls(undefined)).toBe(0);
    expect(countToolCalls(null)).toBe(0);
    expect(countToolCalls("x")).toBe(0);
  });

  it("countToolCalls caps the counted batch length", () => {
    const batch = Array.from({ length: 500 }, (_, i) => rpc("tools/call", i));
    expect(countToolCalls(batch)).toBe(MAX_BATCH_COUNTED);
  });

  it("web: initialize plus list counts 0 tool calls", async () => {
    const { handler, calls } = setup(true);
    await handler.handleWebRequest(webReq([rpc("initialize"), rpc("tools/list", 2)]));
    expect(calls).toEqual([["tok-1", 0]]);
  });

  it("web: a batch of 2 tool calls counts 2", async () => {
    const { handler, calls } = setup(true);
    await handler.handleWebRequest(webReq([rpc("tools/call"), rpc("tools/call", 2)]));
    expect(calls).toEqual([["tok-1", 2]]);
  });

  it("web: the cloned body still reaches the transport", async () => {
    const { handler, calls } = setup(true);
    const res = await handler.handleWebRequest(webReq(init));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("serverInfo");
    expect(calls).toEqual([["tok-1", 0]]);
  });

  it("web: a malformed body counts 0 and still updates lastUsedAt", async () => {
    const { handler, calls } = setup(true);
    await handler.handleWebRequest(webReq("{not json"));
    expect(calls).toEqual([["tok-1", 0]]);
  });

  it("web: 413 when content-length exceeds 1 MB, with no usage write", async () => {
    const { handler, calls } = setup(true);
    const res = await handler.handleWebRequest(
      webReq(init, { "content-length": String(MAX_BODY_BYTES + 1) }),
    );
    expect(res.status).toBe(413);
    expect(calls).toEqual([]);
  });

  it("web: 413 for an oversized body of unknown length", async () => {
    const { handler, calls } = setup(true);
    const big = "x".repeat(MAX_BODY_BYTES + 10);
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    const req = new Request("http://localhost/mcp", {
      method: "POST",
      headers: { authorization: `Bearer ${PAT}`, "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    const res = await handler.handleWebRequest(req);
    expect(res.status).toBe(413);
    expect(calls).toEqual([]);
  });

  it("web: a dev-token request (no tokenId) is not recorded", async () => {
    const { handler, calls, keys } = setup(true);
    await handler.handleWebRequest(webReq(init, {}, "dev-secret"));
    expect(calls).toEqual([]);
    expect(keys).toEqual(["usr:dev_user"]);
  });

  it("express: initialize plus list counts 0, a batch of 2 counts 2", async () => {
    const { handler, calls } = setup(true);
    await handler.handleExpressRequest(
      expressReq([rpc("initialize"), rpc("tools/list", 2)]),
      expressRes,
    );
    await handler.handleExpressRequest(
      expressReq([rpc("tools/call"), rpc("tools/call", 2)]),
      expressRes,
    );
    expect(calls).toEqual([
      ["tok-1", 0],
      ["tok-1", 2],
    ]);
  });

  it("express: passes parsedBody ?? req.body through to the transport", async () => {
    const spy = vi
      .spyOn(StreamableHTTPServerTransport.prototype, "handleRequest")
      .mockResolvedValue(undefined);
    const { handler, calls } = setup(true);
    const parsed = [rpc("tools/call")];
    await handler.handleExpressRequest(expressReq({ ignored: true }), expressRes, parsed);
    await handler.handleExpressRequest(expressReq(rpc("tools/list")), expressRes);
    expect(spy.mock.calls[0]?.[2]).toBe(parsed);
    expect(spy.mock.calls[1]?.[2]).toEqual(rpc("tools/list"));
    expect(calls).toEqual([
      ["tok-1", 1],
      ["tok-1", 0],
    ]);
    spy.mockRestore();
  });

  it("keys the rate limiter by namespaced token id", async () => {
    const { handler, keys } = setup(false);
    await handler.handleWebRequest(webReq(rpc("tools/call")));
    expect(keys).toEqual(["tok:tok-1"]);
  });

  it("429s are not recorded (web and express)", async () => {
    const { handler, calls } = setup(false);
    const w = await handler.handleWebRequest(webReq([rpc("tools/call")]));
    await handler.handleExpressRequest(expressReq([rpc("tools/call")]), expressRes);
    expect(w.status).toBe(429);
    expect(calls).toEqual([]);
  });

  it("a failing usage write is logged and does not fail the request", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { handler } = setup(true);
    (handler as any).verifier.recordRequest = async () => {
      throw new Error("db down");
    };
    const res = await handler.handleWebRequest(webReq(init));
    expect(res.status).toBe(200);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("does not record usage for failed authentication", async () => {
    const { handler, calls } = setup(true);
    await handler.handleWebRequest(
      new Request("http://localhost/mcp", {
        method: "POST",
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(calls).toEqual([]);
  });
});

describe("HttpMcpHandler kill switch and Origin validation (E20-N18)", () => {
  const dp = {} as McpUserDataProvider;
  const webReq = (origin?: string, auth?: string) =>
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        ...(origin ? { origin } : {}),
        ...(auth ? { authorization: auth } : {}),
      },
    });
  const expressRes = () => {
    const out: { status: number; body: unknown } = { status: 0, body: undefined };
    const res: any = {
      status(code: number) {
        out.status = code;
        return this;
      },
      setHeader() {
        return this;
      },
      json(b: unknown) {
        out.body = b;
        return this;
      },
    };
    return { out, res };
  };

  it("web: 503 before auth when disabled, even with no credentials", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp, isEnabled: () => false });
    expect((await h.handleWebRequest(webReq())).status).toBe(503);
  });

  it("express: 503 before auth when disabled", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp, isEnabled: () => false });
    const { out, res } = expressRes();
    await h.handleExpressRequest({ headers: {} }, res);
    expect(out.status).toBe(503);
  });

  it("503 wins over a bad Origin", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp, isEnabled: () => false });
    expect((await h.handleWebRequest(webReq("https://evil.example"))).status).toBe(503);
  });

  it("web: a disallowed Origin gets 403 before auth", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp });
    const res = await h.handleWebRequest(webReq("https://evil.example", `Bearer ${PAT}`));
    expect(res.status).toBe(403);
  });

  it("express: a disallowed Origin gets 403, and does not count as a failed auth", async () => {
    const limiter = new FailedAuthLimiter(1, 60_000);
    const h = new HttpMcpHandler({ dataProvider: dp, failedAuthLimiter: limiter });
    for (let i = 0; i < 3; i++) {
      const { out, res } = expressRes();
      await h.handleExpressRequest(
        { headers: { origin: "https://evil.example" }, ip: "1.1.1.1" },
        res,
      );
      expect(out.status).toBe(403);
    }
    const { out, res } = expressRes();
    await h.handleExpressRequest({ headers: {}, ip: "1.1.1.1" }, res);
    expect(out.status).toBe(401);
  });

  it("the literal null Origin is rejected unless listed", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp });
    expect((await h.handleWebRequest(webReq("null"))).status).toBe(403);
  });

  it("a listed Origin passes the gate (case and trailing slash insensitive) and reaches auth", async () => {
    const h = new HttpMcpHandler({
      dataProvider: dp,
      allowedOrigins: ["https://App.Example.com/"],
    });
    expect((await h.handleWebRequest(webReq("https://app.example.com"))).status).toBe(401);
  });

  it("no Origin header is allowed through to auth", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp, allowedOrigins: [] });
    expect((await h.handleWebRequest(webReq())).status).toBe(401);
  });

  it("web: an empty Origin header is 403", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp, allowedOrigins: ["https://app.example.com"] });
    const req = new Request("http://localhost/mcp", { method: "POST", headers: { origin: "" } });
    expect((await h.handleWebRequest(req)).status).toBe(403);
  });

  it("scheme or port mismatch is 403", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp, allowedOrigins: ["https://app.example.com"] });
    for (const o of ["http://app.example.com", "https://app.example.com:8443"]) {
      expect((await h.handleWebRequest(webReq(o))).status).toBe(403);
    }
  });

  it("express: a non-string Origin (repeated header) is 403, not a throw", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp, allowedOrigins: ["https://app.example.com"] });
    const { out, res } = expressRes();
    await h.handleExpressRequest(
      { headers: { origin: ["https://app.example.com", "https://evil.example"] } },
      res,
    );
    expect(out.status).toBe(403);
  });

  it("express: a listed Origin reaches auth (401 without a token)", async () => {
    const h = new HttpMcpHandler({ dataProvider: dp, allowedOrigins: ["https://app.example.com"] });
    const { out, res } = expressRes();
    await h.handleExpressRequest({ headers: { origin: "https://app.example.com" } }, res);
    expect(out.status).toBe(401);
  });

  it("web: a listed Origin with a valid token is not rejected by the gate or auth", async () => {
    const tokenStore = {
      findTokenByHash: vi.fn().mockResolvedValue({
        id: "t1",
        userId: "u1",
        tokenHash: hashPatToken(PAT),
        scopes: ["mcp:read:anonymized"],
        anonymizeInstitutions: true,
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: null,
      }),
      recordRequest: vi.fn().mockResolvedValue(undefined),
    };
    const h = new HttpMcpHandler({
      dataProvider: dp,
      tokenStore,
      allowedOrigins: ["https://app.example.com"],
    });
    const req = new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        authorization: `Bearer ${PAT}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "t", version: "1" },
        },
      }),
    });
    const res = await h.handleWebRequest(req);
    expect([401, 403, 503]).not.toContain(res.status);
    expect(tokenStore.findTokenByHash).toHaveBeenCalled();
  });

  it('Origin "null" stays 403 when the backend config contains null (entry is dropped)', async () => {
    // Mirrors mcp.service.ts: allowedOrigins comes from readMcpAccessConfig, which drops null and *.
    const h = new HttpMcpHandler({ dataProvider: dp, allowedOrigins: [] });
    expect((await h.handleWebRequest(webReq("null"))).status).toBe(403);
  });
});

describe("audit and staging wiring (re-plan PR D)", () => {
  it("passes the verified token, client name and staging provider to every tool call", async () => {
    const events: Array<{ tokenId?: string; clientName?: string; tool: string; outcome: string }> =
      [];
    const handler = new HttpMcpHandler({
      dataProvider: {} as McpUserDataProvider,
      tokenStore: {
        findTokenByHash: async () => ({
          id: "tok-9",
          userId: "user-9",
          tokenHash: hashPatToken(PAT),
          scopes: ["mcp:read:anonymized"],
          anonymizeInstitutions: true,
          expiresAt: null,
          revokedAt: null,
        }),
      },
      imports: createFakeImports(),
      fingerprintArgs: () => "f".repeat(64),
      audit: (caller, event) => {
        events.push({
          tokenId: caller.token.tokenId,
          clientName: caller.clientName,
          tool: event.tool,
          outcome: event.outcome,
        });
      },
    });
    const res = await handler.handleWebRequest(
      new Request("http://localhost/mcp", {
        method: "POST",
        headers: {
          authorization: `Bearer ${PAT}`,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "user-agent": "test-client/1.0",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_import_status", arguments: { batchId: SEEDED_BATCH_ID } },
        }),
      }),
    );
    await res.text();
    // The token lacks write:stage, so the call is refused and audited as denied.
    expect(events).toEqual([
      {
        tokenId: "tok-9",
        clientName: "test-client/1.0",
        tool: "get_import_status",
        outcome: "denied",
      },
    ]);
  });
});
