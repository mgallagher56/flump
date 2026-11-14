import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { AUDIT_TOOL_NAME, primitiveAuditName } from "./audit.js";
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
