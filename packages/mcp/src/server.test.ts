import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { type CreateMcpServerOptions, createFlumpMcpServer } from "./server.js";
import { TEST_TOKEN } from "./testing/client.js";
import { createFakeProvider } from "./testing/fake-provider.js";
import { emptyUser } from "./testing/personas.js";
import type { McpAuditEvent } from "./types.js";

async function connect(options: Partial<CreateMcpServerOptions>) {
  const server = createFlumpMcpServer({
    token: TEST_TOKEN,
    dataProvider: createFakeProvider(emptyUser),
    ...options,
  });
  const client = new Client({ name: "c", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(b), client.connect(a)]);
  return client;
}

describe("createFlumpMcpServer", () => {
  it("passes the host's argument fingerprint to the tool audit rows", async () => {
    const events: McpAuditEvent[] = [];
    const client = await connect({
      audit: (e) => void events.push(e),
      fingerprintArgs: () => "fp-1",
    });
    await client.callTool({ name: "list_accounts", arguments: {} });
    expect(events).toEqual([
      expect.objectContaining({ tool: "list_accounts", argsFingerprint: "fp-1" }),
    ]);
    await client.close();
  });

  it("logs a failing tool through the host's logger, not the console", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logger = { warn: vi.fn(), error: vi.fn() };
    const provider = createFakeProvider(emptyUser);
    const failing = new Proxy(provider, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? () => Promise.reject(new Error("db down")) : value;
      },
    });
    const client = await connect({ dataProvider: failing, logger });
    const result = await client.callTool({ name: "list_accounts", arguments: {} });
    expect(result.isError).toBe(true);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    await client.close();
  });
});
