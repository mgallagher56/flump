import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineFlumpTool, type FlumpToolDefinition } from "./define-tool.js";
import { FlumpToolError } from "./errors.js";
import { createFakeProvider } from "./testing/fake-provider.js";
import { emptyUser } from "./testing/personas.js";
import type { McpAuditEvent, McpServerContext } from "./types.js";

// Reuses a real TOOL_SCOPES name (READ requirement) so the fail-closed lookup passes.
const NAME = "evaluate_cashflow_runway_and_health";

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

  it("returns INVALID_ARGUMENT naming the field when the SDK passes bad input through", async () => {
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

  it("audits ok and error calls without arguments or results", async () => {
    const events: McpAuditEvent[] = [];
    const { call } = await connect(def(), { ctx: { audit: (e) => void events.push(e) } });
    await call({ n: 1 });
    await call({ n: -1 }).catch(() => {});
    expect(events[0]).toMatchObject({ tool: NAME, outcome: "ok" });
    expect(Object.keys(events[0] ?? {}).sort()).toEqual(["durationMs", "outcome", "tool"]);
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
