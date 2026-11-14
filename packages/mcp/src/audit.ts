import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { INSUFFICIENT_SCOPE, type McpPrimitiveKind, requirementFor } from "./auth/scopes.js";
import type { McpAuditEvent, McpServerContext } from "./types.js";

/** The audit row's tool-name rule, the same one the backend applies before writing. */
export const AUDIT_TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * Sends one event to the sink, fire and forget: a slow, rejecting or throwing sink must never
 * delay or break the call being audited.
 */
export function fireAudit(sink: McpServerContext["audit"], event: McpAuditEvent): void {
  if (!sink) return;
  try {
    const pending = sink(event);
    if (pending) pending.catch(() => {});
  } catch {
    // Swallowed.
  }
}

/** The scopes a primitive needed that the token holds (identifiers only, for the audit row). */
export function scopesUsedFor(
  kind: McpPrimitiveKind,
  name: string,
  held: readonly string[],
): string[] {
  const requirement = requirementFor(kind, name);
  if (!requirement) return [];
  return [...requirement.anyOf, ...requirement.allOf].filter((s) => held.includes(s));
}

const PREFIX = { prompt: "prompt_get", resource: "resource_read" } as const;

/**
 * Audit name for a prompt or resource read: `prompt_get_<name>` or `resource_read_<name>`, with
 * hyphens as underscores. The name is the one we registered (never user data); if it does not fit
 * the audit rule, only the generic prefix is used.
 */
export function primitiveAuditName(kind: "prompt" | "resource", name: string): string {
  const specific = `${PREFIX[kind]}_${name.replace(/-/g, "_")}`;
  return AUDIT_TOOL_NAME.test(specific) ? specific : PREFIX[kind];
}

function byteLength(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? "", "utf8");
  } catch {
    return 0;
  }
}

const KINDS: Record<string, "prompt" | "resource"> = {
  registerPrompt: "prompt",
  prompt: "prompt",
  registerResource: "resource",
  resource: "resource",
};

/**
 * Wraps an McpServer so every prompt get and resource read writes one audit row (H12). Apply it
 * INSIDE the scope facade (`withScopeEnforcement(withPrimitiveAudit(server, ctx), scopes)`), so the
 * audit wrapper runs around the scope check and a refused read is recorded as `denied`. Tools are
 * not touched: `defineFlumpTool` audits them itself. Without an audit sink this is a no-op.
 */
export function withPrimitiveAudit<T extends McpServer>(server: T, ctx: McpServerContext): T {
  if (!ctx.audit) return server;
  return new Proxy(server, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target) as unknown;
      if (typeof value !== "function") return value;
      const fn = value as (...a: unknown[]) => unknown;
      const kind = typeof prop === "string" ? KINDS[prop] : undefined;
      if (!kind) return fn.bind(target);
      return (...args: unknown[]) => {
        const idx = args.length - 1;
        const handler = args[idx];
        if (typeof handler !== "function") return fn.apply(target, args);
        const name = String(args[0]);
        const tool = primitiveAuditName(kind, name);
        const scopesUsed = scopesUsedFor(kind, name, ctx.token.scopes);
        const original = handler as (...a: unknown[]) => unknown;
        const audited = async (...handlerArgs: unknown[]) => {
          const started = Date.now();
          const report = (
            outcome: McpAuditEvent["outcome"],
            responseBytes: number,
            errorCode?: string,
          ) =>
            fireAudit(ctx.audit, {
              tool,
              outcome,
              ...(errorCode ? { errorCode } : {}),
              durationMs: Date.now() - started,
              responseBytes,
              scopesUsed,
            });
          try {
            const result = await original(...handlerArgs);
            report("ok", byteLength(result));
            return result;
          } catch (err) {
            const message = err instanceof Error ? err.message : "";
            if (message.startsWith(INSUFFICIENT_SCOPE)) {
              report("denied", Buffer.byteLength(message, "utf8"), "INSUFFICIENT_SCOPE");
            } else {
              report("error", 0, "INTERNAL");
            }
            throw err;
          }
        };
        return fn.apply(target, [...args.slice(0, idx), audited]);
      };
    },
  });
}
