import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { requirementFor } from "./auth/scopes.js";
import { defineFlumpTool, type FlumpToolDefinition } from "./define-tool.js";
import { FlumpToolError } from "./errors.js";
import { FLUMP_TOOLS } from "./server.js";
import { connectTestClient } from "./testing/client.js";
import { createFakeProvider } from "./testing/fake-provider.js";
import { emptyUser } from "./testing/personas.js";
import type { McpAuditEvent, McpServerContext } from "./types.js";

// Reuses a real TOOL_SCOPES name (READ requirement) so the fail-closed lookup passes.
const NAME = "get_budget_summary";

type Def = FlumpToolDefinition<{ n: z.ZodNumber }, z.ZodObject<{ items: z.ZodArray<z.ZodString> }>>;

function def(overrides: Partial<Def> = {}): Def {
  return {
    name: NAME,
    title: "Test tool",
    description: "A test tool.",
    input: { n: z.number().min(0) },
    result: z.object({ items: z.array(z.string()) }),
    handler: ({ n }) => ({ result: { items: Array.from({ length: n }, (_, i) => `item-${i}`) } }),
    ...overrides,
  };
}

async function connect(
  definition: Def,
  opts: { scopes?: string[]; ctx?: Partial<McpServerContext> } = {},
) {
  const server = new McpServer({ name: "t", version: "0" });
  const scopes = opts.scopes ?? ["mcp:read:anonymized"];
  const ctx: McpServerContext = {
    token: { userId: "u", scopes: scopes as never, anonymizeInstitutions: true, type: "pat" },
    dataProvider: createFakeProvider(emptyUser),
    ...opts.ctx,
  };
  const registered = defineFlumpTool(definition).register(server, async () => ctx);
  const client = new Client({ name: "c", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(b), client.connect(a)]);
  const call = (args: Record<string, unknown>) => client.callTool({ name: NAME, arguments: args });
  return { client, server, registered, call };
}

const text = (res: { content?: unknown }) =>
  (res.content as Array<{ text: string }>)[0]?.text ?? "";

describe("defineFlumpTool envelope", () => {
  it("returns structuredContent and a compact text copy of the same envelope", async () => {
    const { call } = await connect(def());
    const res = await call({ n: 2 });
    const sc = res.structuredContent as Record<string, unknown>;
    expect(sc).toMatchObject({
      schemaVersion: "2.0",
      currency: "GBP",
      result: { items: ["item-0", "item-1"] },
      provenance: {},
      assumptions: [],
      missing: [],
      truncated: false,
      nextCursor: null,
    });
    expect(JSON.parse(text(res))).toEqual(sc);
    expect(text(res)).not.toContain("\n");
  });

  it("publishes the envelope as outputSchema and adds responseFormat to the input", async () => {
    const { client } = await connect(def());
    const [tool] = (await client.listTools()).tools;
    expect(tool?.outputSchema?.properties).toHaveProperty("schemaVersion");
    expect(tool?.inputSchema.properties).toHaveProperty("responseFormat");
    expect(tool?.annotations?.readOnlyHint).toBe(true);
  });

  it("passes responseFormat to the handler, defaulting to concise", async () => {
    const seen: string[] = [];
    const { call } = await connect(
      def({
        handler: (_i, _c, o) => {
          seen.push(o.responseFormat);
          return { result: { items: [] } };
        },
      }),
    );
    await call({ n: 0 });
    await call({ n: 0, responseFormat: "detailed" });
    expect(seen).toEqual(["concise", "detailed"]);
  });

  it("carries assumptions, missing, verification and notice through", async () => {
    const { call } = await connect(
      def({
        handler: () => ({
          result: { items: [] },
          taxYear: "2026/27",
          assumptions: [{ field: "x", value: 5, source: "agent_supplied" }],
          missing: [{ field: "apr", why: "needed", askUser: "What is the APR?" }],
          verification: { status: "unverified", detail: "pending" },
          notice: "Not advice.",
        }),
      }),
    );
    const sc = (await call({ n: 0 })).structuredContent as Record<string, unknown>;
    expect(sc).toMatchObject({
      taxYear: "2026/27",
      assumptions: [{ field: "x", value: 5, source: "agent_supplied" }],
      missing: [{ field: "apr", askUser: "What is the APR?" }],
      verification: { status: "unverified" },
      notice: "Not advice.",
    });
  });
});

describe("defineFlumpTool size budget", () => {
  it("halves the largest array until it fits and flags truncation", async () => {
    const { call } = await connect(def({ maxTokens: 100 }));
    const res = await call({ n: 500 });
    const sc = res.structuredContent as {
      truncated: boolean;
      notice: string;
      result: { items: string[] };
    };
    expect(sc.truncated).toBe(true);
    expect(sc.notice).toContain("shortened");
    expect(sc.result.items.length).toBeGreaterThan(0);
    expect(sc.result.items.length).toBeLessThan(500);
    expect(Math.ceil(text(res).length / 4)).toBeLessThanOrEqual(100);
  });

  it("does not truncate within budget", async () => {
    const { call } = await connect(def({ maxTokens: 100 }));
    const sc = (await call({ n: 3 })).structuredContent as { truncated: boolean };
    expect(sc.truncated).toBe(false);
  });

  it("returns an error when nothing can be shortened", async () => {
    const { call } = await connect(
      def({
        handler: () => ({ result: { items: [] }, notice: "x".repeat(2000) }),
        maxTokens: 50,
      }),
    );
    const res = await call({ n: 0 });
    expect(res.isError).toBe(true);
    expect(JSON.parse(text(res)).error.code).toBe("INVALID_ARGUMENT");
  });
});

describe("defineFlumpTool truncation edge cases", () => {
  it("clears nextCursor when the result is truncated", async () => {
    const { call } = await connect(
      def({
        maxTokens: 100,
        handler: () => ({
          result: { items: Array.from({ length: 500 }, (_, i) => `item-${i}`) },
          nextCursor: "abc",
        }),
      }),
    );
    const sc = (await call({ n: 0 })).structuredContent as {
      truncated: boolean;
      nextCursor: unknown;
    };
    expect(sc.truncated).toBe(true);
    expect(sc.nextCursor).toBeNull();
  });

  it("keeps nextCursor when nothing is truncated", async () => {
    const { call } = await connect(
      def({ handler: () => ({ result: { items: ["a"] }, nextCursor: "abc" }) }),
    );
    const sc = (await call({ n: 0 })).structuredContent as { nextCursor: unknown };
    expect(sc.nextCursor).toBe("abc");
  });

  it("returns an error, not an SDK output-validation failure, when truncation breaks a min length", async () => {
    const { call } = await connect(
      def({
        result: z.object({ items: z.array(z.string()).min(40) }),
        maxTokens: 100,
        handler: () => ({ result: { items: Array.from({ length: 60 }, (_, i) => `item-${i}`) } }),
      }),
    );
    const res = await call({ n: 0 });
    expect(res.isError).toBe(true);
    expect(JSON.parse(text(res)).error.code).toBe("INVALID_ARGUMENT");
    expect(text(res)).not.toMatch(/output validation/i);
  });

  it("says the metadata is the problem when it alone exceeds the budget", async () => {
    const { call } = await connect(
      def({
        maxTokens: 50,
        handler: () => ({
          result: { items: ["a", "b"] },
          missing: [{ field: "f", why: "w".repeat(1000), askUser: "q" }],
        }),
      }),
    );
    const body = JSON.parse(text(await call({ n: 0 }))).error;
    expect(body.code).toBe("INVALID_ARGUMENT");
    expect(body.message).toMatch(/assumptions, missing-data and notice/);
  });
});

describe("tool scope table", () => {
  it("has a TOOL_SCOPES entry for every defined and legacy tool", async () => {
    const h = await connectTestClient(emptyUser);
    const legacy = (await h.client.listTools()).tools.map((t) => t.name);
    await h.close();
    expect(legacy.length).toBeGreaterThan(0);
    for (const name of [...legacy, ...FLUMP_TOOLS.map((t) => t.name)]) {
      expect(requirementFor("tool", name), name).toBeDefined();
    }
  });
});

describe("defineFlumpTool error contract", () => {
  it("maps FlumpToolError to an isError result with every field", async () => {
    const { call } = await connect(
      def({
        handler: () => {
          throw new FlumpToolError("MISSING_DATA", "Need the mortgage rate.", {
            hint: "Ask the user.",
            askUser: ["What interest rate is your mortgage on?"],
            field: "mortgageRateAprPct",
          });
        },
      }),
    );
    const res = await call({ n: 0 });
    expect(res.isError).toBe(true);
    expect(JSON.parse(text(res))).toEqual({
      error: {
        code: "MISSING_DATA",
        message: "Need the mortgage rate.",
        hint: "Ask the user.",
        retryable: false,
        field: "mortgageRateAprPct",
        askUser: ["What interest rate is your mortgage on?"],
      },
    });
  });

  it.each([
    ["UNSUPPORTED_TAX_YEAR", { supportedYears: ["2025/26", "2026/27"] }],
    ["NOT_FOUND", {}],
    ["CALCULATION_UNVERIFIED_BLOCKED", {}],
    ["CONFIRMATION_EXPIRED", {}],
    ["CONFIRMATION_MISMATCH", {}],
  ] as const)("returns %s", async (code, init) => {
    const { call } = await connect(
      def({
        handler: () => {
          throw new FlumpToolError(code, "m", init);
        },
      }),
    );
    const body = JSON.parse(text(await call({ n: 0 }))).error;
    expect(body.code).toBe(code);
    expect(body).toMatchObject(init);
  });

  it("RATE_LIMITED is retryable and carries retryAfterSeconds", async () => {
    const { call } = await connect(
      def({
        handler: () => {
          throw new FlumpToolError("RATE_LIMITED", "Slow down.", { retryAfterSeconds: 30 });
        },
      }),
    );
    const body = JSON.parse(text(await call({ n: 0 }))).error;
    expect(body).toMatchObject({ code: "RATE_LIMITED", retryable: true, retryAfterSeconds: 30 });
  });

  it("hides the message and stack of an unexpected exception behind a correlation id", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { call } = await connect(
      def({
        handler: () => {
          throw new Error("secret balance 12345 at /srv/app.ts");
        },
      }),
    );
    const res = await call({ n: 0 });
    const logged = spy.mock.calls.flat().join(" ");
    spy.mockRestore();
    expect(res.isError).toBe(true);
    expect(text(res)).not.toContain("secret");
    expect(text(res)).not.toContain("app.ts");
    expect(logged).not.toContain("secret");
    const body = JSON.parse(text(res)).error;
    expect(body.code).toBe("INTERNAL");
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("run() itself returns INVALID_ARGUMENT naming the field when invoked directly (not the client path)", async () => {
    const { registered } = await connect(def());
    const handler = (
      registered as unknown as {
        handler: (a: unknown) => Promise<{ content: Array<{ text: string }> }>;
      }
    ).handler;
    const res = await handler({ n: -1 });
    const body = JSON.parse(res.content[0]?.text ?? "").error;
    expect(body).toMatchObject({ code: "INVALID_ARGUMENT", field: "n", retryable: false });
  });

  it("PINNED LIMIT: a client sending bad input gets the SDK's text, not the 6.6 JSON", async () => {
    const { call } = await connect(def());
    const res = await call({ n: -1 });
    expect(res.isError).toBe(true);
    const body = text(res);
    expect(body).toBe(
      `MCP error -32602: Input validation error: Invalid arguments for tool ${NAME}: Too small: expected number to be >=0 at n`,
    );
    expect(() => JSON.parse(body)).toThrow();
    expect(res.structuredContent).toBeUndefined();
  });

  it("fails as INTERNAL when the handler breaks the result schema", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { call } = await connect(def({ handler: () => ({ result: { items: [1] as never } }) }));
    const res = await call({ n: 0 });
    spy.mockRestore();
    expect(JSON.parse(text(res)).error.code).toBe("INTERNAL");
  });
});

describe("defineFlumpTool scopes and hooks", () => {
  it("denies a token without the required scope as INSUFFICIENT_SCOPE", async () => {
    const handler = vi.fn(() => ({ result: { items: [] } }));
    const { call } = await connect(def({ handler }), { scopes: ["mcp:simulate"] });
    const res = await call({ n: 0 });
    expect(res.isError).toBe(true);
    expect(JSON.parse(text(res)).error.code).toBe("INSUFFICIENT_SCOPE");
    expect(handler).not.toHaveBeenCalled();
  });

  it("uses ctx.authorize when supplied", async () => {
    const authorize = vi.fn(() => false);
    const { call } = await connect(def(), { ctx: { authorize } });
    const res = await call({ n: 0 });
    expect(JSON.parse(text(res)).error.code).toBe("INSUFFICIENT_SCOPE");
    expect(authorize).toHaveBeenCalledWith(expect.objectContaining({ anyOf: expect.any(Array) }));
  });

  it("fails closed at registration when the tool has no scope entry", () => {
    const server = new McpServer({ name: "t", version: "0" });
    expect(() =>
      defineFlumpTool(def({ name: "unlisted_tool" })).register(server, async () => {
        throw new Error("unused");
      }),
    ).toThrow(/no scope entry/);
  });

  it("refuses update({ callback }) because it would bypass the scope check", async () => {
    const { registered } = await connect(def());
    expect(() => registered.update({ callback: (() => ({ content: [] })) as never })).toThrow(
      /bypass/,
    );
  });

  it("audits ok calls and errors raised inside run(), without arguments or results", async () => {
    const events: McpAuditEvent[] = [];
    const { call } = await connect(
      def({
        handler: ({ n }) => {
          if (n === 99) throw new FlumpToolError("NOT_FOUND", "secret-detail");
          return { result: { items: [] } };
        },
      }),
      { ctx: { audit: (e) => void events.push(e) } },
    );
    await call({ n: 1 });
    await call({ n: 99 });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ tool: NAME, outcome: "ok" });
    expect(events[1]).toMatchObject({ tool: NAME, outcome: "error", errorCode: "NOT_FOUND" });
    expect(Object.keys(events[0] ?? {}).sort()).toEqual(["durationMs", "outcome", "tool"]);
    expect(JSON.stringify(events)).not.toContain("secret-detail");
  });

  it("does not audit SDK-level schema rejections (no authenticated action ran)", async () => {
    const events: McpAuditEvent[] = [];
    const { call } = await connect(def(), { ctx: { audit: (e) => void events.push(e) } });
    await call({ n: -1 }).catch(() => {});
    expect(events).toEqual([]);
  });

  it("does not wait for a hanging audit sink", async () => {
    const { call } = await connect(def(), { ctx: { audit: () => new Promise<void>(() => {}) } });
    const res = await call({ n: 1 });
    expect(res.isError).toBeFalsy();
  });

  it("swallows a rejecting async audit sink", async () => {
    const { call } = await connect(def(), { ctx: { audit: () => Promise.reject(new Error("x")) } });
    const res = await call({ n: 1 });
    expect(res.isError).toBeFalsy();
  });

  it("survives a throwing audit sink", async () => {
    const { call } = await connect(def(), {
      ctx: {
        audit: () => {
          throw new Error("sink down");
        },
      },
    });
    const res = await call({ n: 1 });
    expect(res.isError).toBeFalsy();
  });
});
