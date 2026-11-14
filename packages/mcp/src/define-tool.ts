import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  hasScopes,
  insufficientScopeMessage,
  requirementFor,
  type ScopeRequirement,
} from "./auth/scopes.js";
import {
  buildEnvelope,
  DEFAULT_MAX_TOKENS,
  envelopeSchema,
  fitToBudget,
  RESPONSE_FORMATS,
  type ResponseFormat,
  type ToolOutput,
} from "./envelope.js";
import {
  type ErrorResult,
  errorResult,
  type FlumpErrorBody,
  FlumpToolError,
  internalErrorBody,
} from "./errors.js";
import type { McpServerContext } from "./types.js";

export interface FlumpToolDefinition<I extends z.ZodRawShape, R extends z.ZodType> {
  /** Must have an entry in `TOOL_SCOPES` (fail closed). */
  name: string;
  title: string;
  description: string;
  /** Zod raw shape. `responseFormat` is added for you. */
  input: I;
  /** Schema of `result`; the envelope around it is the tool's `outputSchema`. */
  result: R;
  annotations?: ToolAnnotations;
  /** Response budget in estimated tokens (characters divided by 4). */
  maxTokens?: number;
  handler(
    input: z.infer<z.ZodObject<I>>,
    ctx: McpServerContext,
    options: { responseFormat: ResponseFormat },
  ): Promise<ToolOutput<z.infer<R>>> | ToolOutput<z.infer<R>>;
}

const DEFAULT_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function authorized(ctx: McpServerContext, requirement: ScopeRequirement): boolean {
  return ctx.authorize ? ctx.authorize(requirement) : hasScopes(ctx.token.scopes, requirement);
}

/**
 * Builds a tool with zod input and output validation, the response envelope, the error contract,
 * a scope check and a size budget. Register it on the raw `McpServer`, not the legacy scope facade:
 * it does the scope check itself, and it blocks `update({ callback })`, which would bypass it.
 */
export function defineFlumpTool<I extends z.ZodRawShape, R extends z.ZodType>(
  definition: FlumpToolDefinition<I, R>,
) {
  const outputSchema = envelopeSchema(definition.result);
  const inputSchema = {
    ...definition.input,
    responseFormat: z
      .enum(RESPONSE_FORMATS)
      .default("concise")
      .describe("concise (default) keeps the answer short; detailed returns the full breakdown"),
  };
  const inputObject = z.object(inputSchema);

  return {
    name: definition.name,
    register(server: McpServer, getContext: () => Promise<McpServerContext>) {
      const requirement = requirementFor("tool", definition.name);
      if (!requirement) {
        throw new Error(`MCP tool "${definition.name}" has no scope entry; add it to TOOL_SCOPES.`);
      }

      const run = async (rawArgs: unknown): Promise<ErrorResult | Record<string, unknown>> => {
        const started = Date.now();
        const ctx = await getContext();
        // The scopes this call needed that the token holds (identifiers only, for the audit row).
        const needed = [...requirement.anyOf, ...requirement.allOf];
        const scopesUsed = needed.filter((s) => ctx.token.scopes.includes(s));
        let argsFingerprint: string | undefined;
        // Fire and forget: a slow or failing sink must never delay or break a tool call.
        const report = (
          outcome: "ok" | "error" | "denied",
          responseText: string,
          errorCode?: FlumpErrorBody["code"],
        ) => {
          try {
            const pending = ctx.audit?.({
              tool: definition.name,
              outcome,
              ...(errorCode ? { errorCode } : {}),
              durationMs: Date.now() - started,
              responseBytes: Buffer.byteLength(responseText, "utf8"),
              scopesUsed,
              ...(argsFingerprint ? { argsFingerprint } : {}),
            });
            if (pending) pending.catch(() => {});
          } catch {
            // Swallowed.
          }
        };
        const fail = (body: FlumpErrorBody) => {
          const result = errorResult(body);
          report(
            body.code === "INSUFFICIENT_SCOPE" ? "denied" : "error",
            result.content[0]?.text ?? "",
            body.code,
          );
          return result;
        };

        if (!authorized(ctx, requirement)) {
          return fail({
            code: "INSUFFICIENT_SCOPE",
            message: insufficientScopeMessage("tool", definition.name),
            hint: "Create a token with the required scope in Flump settings.",
            retryable: false,
          });
        }

        const parsed = inputObject.safeParse(rawArgs ?? {});
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          return fail({
            code: "INVALID_ARGUMENT",
            message: issue?.message ?? "The arguments do not match the input schema.",
            hint: "Check the input schema and try again.",
            retryable: false,
            ...(issue?.path.length ? { field: issue.path.join(".") } : {}),
          });
        }

        try {
          argsFingerprint = ctx.fingerprintArgs?.(parsed.data) ?? undefined;
        } catch {
          // Swallowed: a broken fingerprint must not break the call.
        }

        try {
          const { responseFormat, ...input } = parsed.data as { responseFormat: ResponseFormat };
          const output = await definition.handler(input as z.infer<z.ZodObject<I>>, ctx, {
            responseFormat,
          });
          const envelope = buildEnvelope(output);
          if (!outputSchema.safeParse(envelope).success) {
            throw new Error("output failed schema validation");
          }
          const fitted = fitToBudget(envelope, definition.maxTokens ?? DEFAULT_MAX_TOKENS);
          // Halving arrays can break constraints such as min length, so re-validate what we send.
          if (!fitted.ok || !outputSchema.safeParse(fitted.envelope).success) {
            return fail({
              code: "INVALID_ARGUMENT",
              message:
                !fitted.ok && fitted.reason === "overhead"
                  ? "The assumptions, missing-data and notice fields alone exceed the response size budget."
                  : "The result is too large for the response size budget.",
              hint: "Narrow the request (a shorter range or a single item) or use concise format.",
              retryable: false,
            });
          }
          report("ok", fitted.text);
          return {
            content: [{ type: "text", text: fitted.text }],
            structuredContent: fitted.envelope,
          };
        } catch (err) {
          if (err instanceof FlumpToolError) return fail(err.toBody());
          // No message, stack or input leaves the handler: only a correlation id.
          const body = internalErrorBody(randomUUID());
          console.error(`[flump-mcp] tool ${definition.name} failed (${body.correlationId})`);
          return fail(body);
        }
      };

      const registered = server.registerTool(
        definition.name,
        {
          title: definition.title,
          description: definition.description,
          inputSchema,
          outputSchema,
          annotations: { ...DEFAULT_ANNOTATIONS, ...definition.annotations },
        },
        // The SDK validates input against `inputSchema` BEFORE this callback runs, so a client sending
        // schema-invalid input gets the SDK's plain-text "Input validation error" (which may echo
        // unrecognised keys), not our INVALID_ARGUMENT JSON, and the call is not audited. The strict
        // schema stays registered so tools/list advertises it; that list is not scope-filtered, so
        // validating before the scope check reveals nothing new. `run` re-validates for direct
        // invocation and semantic checks.
        ((args: unknown) => run(args)) as never,
      );

      const originalUpdate = registered.update.bind(registered);
      registered.update = ((updates: { callback?: unknown }) => {
        if (updates.callback) {
          throw new Error(
            `MCP tool "${definition.name}": replacing the callback would bypass scope checks.`,
          );
        }
        return originalUpdate(updates as never);
      }) as typeof registered.update;

      return registered;
    },
  };
}

export type DefinedFlumpTool = ReturnType<typeof defineFlumpTool>;
