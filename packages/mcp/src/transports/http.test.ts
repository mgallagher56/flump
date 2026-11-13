import { describe, expect, it, vi } from "vitest";
import { FailedAuthLimiter } from "../auth/failed-auth-limiter.js";
import { hashPatToken } from "../auth/token-verifier.js";
import type { McpUserDataProvider } from "../types.js";
import { countToolCalls, HttpMcpHandler } from "./http.js";

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
    limiter.recordFailure("7.7.7.7");
    const res = await handler.handleWebRequest(webReq("Bearer dev-secret", "7.7.7.7"));
    expect(res.status).toBe(429);
    limiter.recordFailure("7.7.7.7");
    expect(limiter.check("7.7.7.7").blocked).toBe(false);
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
    limiter.recordFailure("7.7.7.8");
    const res: any = { status: () => res, setHeader: () => res, json: () => res };
    await handler.handleExpressRequest(
      { ip: "7.7.7.8", headers: { authorization: "Bearer dev-secret" } },
      res,
    );
    limiter.recordFailure("7.7.7.8");
    expect(limiter.check("7.7.7.8").blocked).toBe(false);
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
  const setup = () => {
    const calls: Array<[string, number]> = [];
    const keys: string[] = [];
    const handler = new HttpMcpHandler({
      dataProvider: {} as McpUserDataProvider,
      tokenStore: {
        findTokenByHash: async () => record("tok-1"),
        recordRequest: async (id, n) => {
          calls.push([id, n]);
        },
      },
      rateLimiter: {
        checkLimit: (key: string) => {
          keys.push(key);
          return { allowed: false, resetSeconds: 1, message: "x" };
        },
      } as never,
    });
    return { handler, calls, keys };
  };
  const rpc = (method: string, id = 1) => ({ jsonrpc: "2.0", id, method, params: {} });
  const webReq = (body: unknown) =>
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: { authorization: `Bearer ${PAT}`, "content-type": "application/json" },
      body: JSON.stringify(body),
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

  // The rate limiter denies here, so only the counting before it is under test.
  it("web: initialize plus list counts 0 tool calls", async () => {
    const { handler, calls } = setup();
    await handler.handleWebRequest(webReq([rpc("initialize"), rpc("tools/list", 2)]));
    expect(calls).toEqual([["tok-1", 0]]);
  });

  it("web: a batch of 2 tool calls counts 2", async () => {
    const { handler, calls } = setup();
    await handler.handleWebRequest(webReq([rpc("tools/call"), rpc("tools/call", 2)]));
    expect(calls).toEqual([["tok-1", 2]]);
  });

  it("express: initialize plus list counts 0, a batch of 2 counts 2", async () => {
    const { handler, calls } = setup();
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

  it("keys the rate limiter by tokenId", async () => {
    const { handler, keys } = setup();
    await handler.handleWebRequest(webReq(rpc("tools/call")));
    expect(keys).toEqual(["tok-1"]);
  });

  it("a failing usage write is logged and does not fail the request", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { handler } = setup();
    (handler as any).verifier.recordRequest = async () => {
      throw new Error("db down");
    };
    const res = await handler.handleWebRequest(webReq(rpc("tools/call")));
    expect(res.status).toBe(429);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("does not record usage for failed authentication", async () => {
    const { handler, calls } = setup();
    await handler.handleWebRequest(
      new Request("http://localhost/mcp", {
        method: "POST",
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(calls).toEqual([]);
  });
});
