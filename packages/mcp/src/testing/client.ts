import type { BuildContextPackInput } from "@flump/finance-engine";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { VerifiedToken } from "../auth/token-verifier.js";
import { createFlumpMcpServer } from "../server.js";
import type { McpAuditEvent } from "../types.js";
import { createFakeImports, type FakeImports } from "./fake-imports.js";
import {
  createFakeProvider,
  type FakeProvider,
  type FakeProviderOptions,
} from "./fake-provider.js";

export const TEST_TOKEN: VerifiedToken = {
  userId: "user_test",
  scopes: ["mcp:read:anonymized", "mcp:simulate", "write:stage"],
  anonymizeInstitutions: true,
  type: "pat",
};

export interface TestHarness {
  client: Client;
  provider: FakeProvider;
  /** The staging double the write tools call. */
  imports: FakeImports;
  /** Every audit event the server emitted. */
  auditEvents: McpAuditEvent[];
  /** Calls a tool and returns the parsed JSON of its first text block. */
  callJson(name: string, args?: Record<string, unknown>): Promise<unknown>;
  /** Calls a tool and returns the raw text of its first text block. */
  callText(name: string, args?: Record<string, unknown>): Promise<string>;
  close(): Promise<void>;
}

/** Connects a real SDK `Client` to `createFlumpMcpServer` over an in-memory transport. */
export async function connectTestClient(
  data: BuildContextPackInput,
  options: FakeProviderOptions & {
    token?: VerifiedToken;
    imports?: FakeImports;
    /** Leave the server without a staging provider (as on stdio). */
    noImports?: boolean;
  } = {},
): Promise<TestHarness> {
  const provider = createFakeProvider(data, options);
  const imports = options.imports ?? createFakeImports();
  const auditEvents: McpAuditEvent[] = [];
  const server = createFlumpMcpServer({
    token: options.token ?? TEST_TOKEN,
    dataProvider: provider,
    ...(options.noImports ? {} : { imports }),
    audit: (e) => void auditEvents.push(e),
  });
  const client = new Client({ name: "flump-test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const callText = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const content = res.content as Array<{ type: string; text?: string }>;
    return content[0]?.text ?? "";
  };

  return {
    client,
    provider,
    imports,
    auditEvents,
    callText,
    async callJson(name, args) {
      return JSON.parse(await callText(name, args));
    },
    async close() {
      await client.close();
      await server.close();
    },
  };
}

/** Collects every number and string value in a JSON tree. */
function walk(value: unknown, out: Array<number | string>): void {
  if (typeof value === "number" || typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) walk(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) walk(v, out);
}

/** Default values the tools substitute silently when the user's data is missing. */
export const KNOWN_DEFAULTS: ReadonlyArray<number | string> = [
  45000,
  5000,
  15000,
  19.9,
  0.72,
  350000,
  220000,
  4.5,
  240,
  "PLAN_2",
];

/**
 * Lists which known default values appear in a tool's JSON output (as a number or string
 * value, not inside prose). The N1 leak table asserts this list; it shrinks as later
 * tickets remove each default.
 */
export function detectDefaultLeaks(output: unknown): Array<number | string> {
  const values: Array<number | string> = [];
  walk(output, values);
  const norm = (v: number | string) =>
    typeof v === "string" ? v.toLowerCase().replace(/_/g, "") : v;
  const seen = values.map(norm);
  return KNOWN_DEFAULTS.filter((d) => seen.includes(norm(d)));
}

/** Drops the interim `assumptions[]` (E17-N5) so omitted-input and explicit-input outputs compare. */
export function omitAssumptions(output: unknown): unknown {
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const { assumptions: _assumptions, ...rest } = output as Record<string, unknown>;
    return rest;
  }
  return output;
}
