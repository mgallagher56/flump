import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUDIT_TOOL_NAME, primitiveAuditName, scopesUsedFor, withPrimitiveAudit } from "./audit.js";
import { RAW_INPUT_AUDIT_NAME } from "./auth/scopes.js";
import type { VerifiedToken } from "./auth/token-verifier.js";
import { SCHEMA_RESOURCE_URI } from "./resources/schema.resource.js";
import { createFlumpMcpServer } from "./server.js";
import { connectTestClient, TEST_TOKEN } from "./testing/client.js";
import { createFakeProvider } from "./testing/fake-provider.js";
import { emptyUser } from "./testing/personas.js";
import type { McpAuditEvent } from "./types.js";

async function connectWithSink(audit: (e: McpAuditEvent) => void | Promise<void>) {
  const server = createFlumpMcpServer({
    token: TEST_TOKEN,
    dataProvider: createFakeProvider(emptyUser),
    audit,
  });
  const client = new Client({ name: "c", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(b), client.connect(a)]);
  return client;
}

describe("primitiveAuditName", () => {
  it("names prompts and resources by a fixed prefix plus the registered name", () => {
    expect(primitiveAuditName("prompt", "import-spreadsheet")).toBe(
      "prompt_get_import_spreadsheet",
    );
    expect(primitiveAuditName("prompt", "monthly-check-in")).toBe("prompt_get_monthly_check_in");
    expect(primitiveAuditName("resource", "schema")).toBe("resource_read_schema");
  });

  it("falls back to the generic prefix for a name that does not fit the audit rule", () => {
    expect(primitiveAuditName("resource", "Bad Name!")).toBe("resource_read");
    expect(primitiveAuditName("prompt", "x".repeat(80))).toBe("prompt_get");
    expect(AUDIT_TOOL_NAME.test(primitiveAuditName("prompt", "x".repeat(80)))).toBe(true);
  });
});

describe("prompt and resource audit (H12)", () => {
  it("writes one ok row per resource read and prompt get, with no arguments", async () => {
    const h = await connectTestClient(emptyUser);
    try {
      await h.client.readResource({ uri: SCHEMA_RESOURCE_URI });
      await h.client.getPrompt({ name: "monthly-check-in", arguments: { month: "2026-01" } });
      await h.client.getPrompt({ name: "import-spreadsheet" });
      expect(h.auditEvents.map((e) => [e.tool, e.outcome])).toEqual([
        ["resource_read_schema", "ok"],
        ["prompt_get_monthly_check_in", "ok"],
        ["prompt_get_import_spreadsheet", "ok"],
      ]);
      for (const e of h.auditEvents) {
        expect(e.tool).toMatch(AUDIT_TOOL_NAME);
        expect(e.responseBytes).toBeGreaterThan(0);
        expect(e).not.toHaveProperty("argsFingerprint");
        expect(Object.keys(e).sort()).toEqual([
          "durationMs",
          "outcome",
          "responseBytes",
          "scopesUsed",
          "tool",
        ]);
      }
      expect(h.auditEvents[0]?.scopesUsed).toEqual(["mcp:read:anonymized"]);
      expect(h.auditEvents[1]?.scopesUsed).toEqual(["mcp:read:anonymized", "write:stage"]);
      expect(JSON.stringify(h.auditEvents)).not.toContain("2026-01");
    } finally {
      await h.close();
    }
  });

  it("records a scope refusal as denied with INSUFFICIENT_SCOPE", async () => {
    const token: VerifiedToken = { ...TEST_TOKEN, scopes: ["mcp:read:anonymized"] };
    const h = await connectTestClient(emptyUser, { token });
    try {
      await expect(h.client.getPrompt({ name: "import-spreadsheet" })).rejects.toThrow(
        /INSUFFICIENT_SCOPE/,
      );
      expect(h.auditEvents).toEqual([
        expect.objectContaining({
          tool: "prompt_get_import_spreadsheet",
          outcome: "denied",
          errorCode: "INSUFFICIENT_SCOPE",
          scopesUsed: ["mcp:read:anonymized"],
        }),
      ]);
    } finally {
      await h.close();
    }
  });

  it("does not audit list calls, which return no user data", async () => {
    const h = await connectTestClient(emptyUser);
    try {
      await h.client.listPrompts();
      await h.client.listResources();
      await h.client.listTools();
      expect(h.auditEvents).toEqual([]);
    } finally {
      await h.close();
    }
  });

  it("a hanging, rejecting or throwing sink never delays or fails a read", async () => {
    for (const audit of [
      () => new Promise<void>(() => {}),
      () => Promise.reject(new Error("x")),
      () => {
        throw new Error("sink down");
      },
    ]) {
      const client = await connectWithSink(audit);
      const res = await client.readResource({ uri: SCHEMA_RESOURCE_URI });
      expect(res.contents).toHaveLength(1);
      const prompt = await client.getPrompt({ name: "import-spreadsheet" });
      expect(prompt.messages).toHaveLength(1);
      await client.close();
    }
  });
});

describe("audit helpers", () => {
  it("the audit name rule rejects a name that does not start with a lower-case letter", () => {
    expect(AUDIT_TOOL_NAME.test("Bad_name")).toBe(false);
    expect(primitiveAuditName("resource", "Bad name")).toBe("resource_read");
  });

  it("keeps a specific name of exactly 64 characters, the most the audit rule allows", () => {
    // "prompt_get_" is 11 characters, so a 53-character name makes 64 in all.
    const name = "a".repeat(53);
    expect(primitiveAuditName("prompt", name)).toBe(`prompt_get_${name}`);
  });

  it("puts the raw input read in the resource_read family", () => {
    expect(RAW_INPUT_AUDIT_NAME).toMatch(/^resource_read_/);
    expect(AUDIT_TOOL_NAME.test(RAW_INPUT_AUDIT_NAME)).toBe(true);
  });

  it("lists no scopes for a primitive with no scope entry", () => {
    expect(scopesUsedFor("tool", "nope", ["mcp:read:full"])).toEqual([]);
  });
});

describe("withPrimitiveAudit on a stand-in server", () => {
  const fakeServer = () => ({
    name: "fake",
    resource: (..._args: unknown[]) => _args[_args.length - 1],
    prompt: (..._args: unknown[]) => _args[_args.length - 1],
    other: (cb: unknown) => cb,
  });
  type Handler = (...a: unknown[]) => Promise<unknown>;
  const ctxWith = (events: McpAuditEvent[]) =>
    ({
      token: TEST_TOKEN,
      dataProvider: createFakeProvider(emptyUser),
      audit: (e: McpAuditEvent) => void events.push(e),
    }) as never;

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a no-op without an audit sink", () => {
    const server = fakeServer();
    expect(
      withPrimitiveAudit(
        server as never,
        {
          token: TEST_TOKEN,
          dataProvider: createFakeProvider(emptyUser),
        } as never,
      ),
    ).toBe(server);
  });

  it("audits reads registered with the older resource() and prompt() methods", async () => {
    const events: McpAuditEvent[] = [];
    const audited = withPrimitiveAudit(
      fakeServer() as never,
      ctxWith(events),
    ) as unknown as ReturnType<typeof fakeServer>;
    await (
      audited.resource("schema", "flump://schema", async () => ({ contents: [] })) as Handler
    )();
    await (audited.prompt("import-spreadsheet", async () => ({ messages: [] })) as Handler)();
    expect(events.map((e) => e.tool)).toEqual([
      "resource_read_schema",
      "prompt_get_import_spreadsheet",
    ]);
  });

  it("passes other properties, other methods and handler-less calls through untouched", () => {
    const events: McpAuditEvent[] = [];
    const audited = withPrimitiveAudit(
      fakeServer() as never,
      ctxWith(events),
    ) as unknown as ReturnType<typeof fakeServer>;
    expect(audited.name).toBe("fake");
    const cb = () => "x";
    expect(audited.other(cb)).toBe(cb);
    expect(audited.resource("schema", "flump://schema")).toBe("flump://schema");
  });

  it("records the time the read took", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-19T12:00:00Z"));
    const events: McpAuditEvent[] = [];
    const audited = withPrimitiveAudit(
      fakeServer() as never,
      ctxWith(events),
    ) as unknown as ReturnType<typeof fakeServer>;
    const handler = audited.resource("schema", "flump://schema", async () => {
      vi.advanceTimersByTime(25);
      return { contents: [] };
    }) as Handler;
    await handler();
    // Started at 12:00:00.000, finished 25 ms later.
    expect(events[0]?.durationMs).toBe(25);
  });

  it("records a failing read as an INTERNAL error with no bytes, and rethrows it", async () => {
    const events: McpAuditEvent[] = [];
    const audited = withPrimitiveAudit(
      fakeServer() as never,
      ctxWith(events),
    ) as unknown as ReturnType<typeof fakeServer>;
    const handler = audited.resource("schema", "flump://schema", async () => {
      throw new Error("db down");
    }) as Handler;
    await expect(handler()).rejects.toThrow("db down");
    expect(events).toEqual([
      expect.objectContaining({ outcome: "error", errorCode: "INTERNAL", responseBytes: 0 }),
    ]);
  });

  it("counts 0 bytes for a result that is empty or cannot be serialised", async () => {
    const events: McpAuditEvent[] = [];
    const audited = withPrimitiveAudit(
      fakeServer() as never,
      ctxWith(events),
    ) as unknown as ReturnType<typeof fakeServer>;
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await (audited.resource("schema", "u", async () => undefined) as Handler)();
    await (audited.resource("schema", "u", async () => circular) as Handler)();
    expect(events.map((e) => e.responseBytes)).toEqual([0, 0]);
  });
});
