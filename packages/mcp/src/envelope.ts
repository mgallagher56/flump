import { z } from "zod";

export const ENVELOPE_SCHEMA_VERSION = "2.0";

/**
 * Default budget for one response, in estimated tokens (characters divided by 4). It counts only
 * the text copy; `structuredContent` carries the same envelope, so the real payload is roughly
 * double. Truncation shortens only top-level arrays in `result` (not nested ones) and sets
 * `nextCursor` to null, so a truncated list cannot be paged yet.
 */
export const DEFAULT_MAX_TOKENS = 4000;

export const RESPONSE_FORMATS = ["concise", "detailed"] as const;
export type ResponseFormat = (typeof RESPONSE_FORMATS)[number];

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const assumptionSchema = z.object({
  field: z.string(),
  value: z.union([z.number(), z.string()]).optional(),
  source: z.enum(["agent_supplied", "default", "user_profile", "derived"]),
  reason: z.string().optional(),
});

const missingSchema = z.object({
  field: z.string(),
  why: z.string(),
  askUser: z.string(),
});

const verificationSchema = z.object({
  status: z.enum(["verified", "unverified"]),
  detail: z.string(),
});

/** Builds the response envelope schema around a tool's own `result` schema. Used as the `outputSchema`. */
export function envelopeSchema<R extends z.ZodType>(result: R) {
  return z.object({
    schemaVersion: z.literal(ENVELOPE_SCHEMA_VERSION),
    asOf: z.iso.datetime(),
    currency: z.literal("GBP"),
    taxYear: z.string().optional(),
    result,
    provenance: z.record(z.string(), z.string()),
    assumptions: z.array(assumptionSchema),
    missing: z.array(missingSchema),
    verification: verificationSchema.optional(),
    notice: z.string().optional(),
    truncated: z.boolean(),
    nextCursor: z.string().nullable(),
  });
}

export interface Envelope<R> {
  schemaVersion: typeof ENVELOPE_SCHEMA_VERSION;
  asOf: string;
  currency: "GBP";
  taxYear?: string;
  result: R;
  provenance: Record<string, string>;
  assumptions: z.infer<typeof assumptionSchema>[];
  missing: z.infer<typeof missingSchema>[];
  verification?: z.infer<typeof verificationSchema>;
  notice?: string;
  truncated: boolean;
  nextCursor: string | null;
}

/** What a handler returns; the wrapper fills in the rest. */
export interface ToolOutput<R> {
  result: R;
  taxYear?: string;
  provenance?: Envelope<R>["provenance"];
  assumptions?: Envelope<R>["assumptions"];
  missing?: Envelope<R>["missing"];
  verification?: Envelope<R>["verification"];
  notice?: string;
  nextCursor?: string | null;
  asOf?: string;
}

export const TRUNCATION_NOTE =
  "Result shortened to fit the response size budget. Narrow the request or ask for a specific item.";

export function buildEnvelope<R>(output: ToolOutput<R>, now: Date = new Date()): Envelope<R> {
  return {
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
    asOf: output.asOf ?? now.toISOString(),
    currency: "GBP",
    ...(output.taxYear === undefined ? {} : { taxYear: output.taxYear }),
    result: output.result,
    provenance: output.provenance ?? {},
    assumptions: output.assumptions ?? [],
    missing: output.missing ?? [],
    ...(output.verification === undefined ? {} : { verification: output.verification }),
    ...(output.notice === undefined ? {} : { notice: output.notice }),
    truncated: false,
    nextCursor: output.nextCursor ?? null,
  };
}

export const compactText = (envelope: unknown): string => JSON.stringify(envelope);

function halve<T>(a: T[]): T[] {
  return a.slice(0, Math.floor(a.length / 2));
}

function shortenLargestArray(result: unknown): unknown | undefined {
  if (Array.isArray(result)) return result.length > 0 ? halve(result) : undefined;
  if (!result || typeof result !== "object") return undefined;
  let best: [string, unknown[]] | undefined;
  for (const [k, v] of Object.entries(result)) {
    if (Array.isArray(v) && v.length > 0 && (!best || v.length > best[1].length)) best = [k, v];
  }
  if (!best) return undefined;
  return { ...(result as Record<string, unknown>), [best[0]]: halve(best[1]) };
}

export type FitResult<R> =
  | { ok: true; envelope: Envelope<R>; text: string }
  | { ok: false; reason: "overhead" | "unshortenable" };

/**
 * Fits the envelope into `maxTokens` by halving the largest top-level array in `result` until it
 * fits. Sets `truncated` and adds a note to `notice`. Returns `{ ok: false }` when no array is left
 * to shorten and the response is still over budget. A truncated envelope always has a null
 * `nextCursor`. Cost is O(log n) re-serialisations of the envelope, fine at these sizes.
 */
export function fitToBudget<R>(envelope: Envelope<R>, maxTokens: number): FitResult<R> {
  let current = envelope;
  let text = compactText(current);
  if (estimateTokens(text) > maxTokens) {
    // Even with an empty result, the metadata (assumptions, missing, verification, notice) is over budget.
    const bare = compactText({ ...envelope, result: null });
    if (estimateTokens(bare) > maxTokens) return { ok: false, reason: "overhead" };
  }
  while (estimateTokens(text) > maxTokens) {
    const shorter = shortenLargestArray(current.result);
    if (shorter === undefined) return { ok: false, reason: "unshortenable" };
    current = {
      ...current,
      result: shorter as R,
      truncated: true,
      // A cursor from the full result would skip the dropped rows, so a truncated page has none.
      nextCursor: null,
      notice: current.notice?.includes(TRUNCATION_NOTE)
        ? current.notice
        : [current.notice, TRUNCATION_NOTE].filter(Boolean).join(" "),
    };
    text = compactText(current);
  }
  return { ok: true, envelope: current, text };
}
