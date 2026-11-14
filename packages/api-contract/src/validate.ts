import type { z } from "zod";

export interface ValidationIssue {
  /** Dotted field path, `[]`-free so it is stable and carries no values. */
  readonly path: string;
  readonly code: string;
  /** The schema's own message. Zod messages name the rule, never the submitted value. */
  readonly message?: string;
}

const MAX_MESSAGE_CHARS = 200;

const joinPath = (segments: readonly PropertyKey[]): string =>
  segments.map(String).join(".") || "(root)";

/**
 * Issues from a zod error: paths, codes and the schema's messages, never values (they are personal
 * data). An `unrecognized_keys` issue is split into one issue per key, so each unknown key has its
 * own path, the same shape `unknownKeys` reports.
 */
export const issuesFromZodError = (error: z.ZodError): ValidationIssue[] =>
  error.issues.flatMap((issue): ValidationIssue[] => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        path: joinPath([...issue.path, key]),
        code: issue.code,
        message: "Unknown field",
      }));
    }
    return [
      {
        path: joinPath(issue.path),
        code: issue.code,
        message: issue.message.slice(0, MAX_MESSAGE_CHARS),
      },
    ];
  });

/**
 * Keys present in a plain-object value that the schema does not declare. Strict schemas report
 * them through zod as well; this also covers a schema that is not strict.
 */
export const unknownKeys = (schema: z.ZodType, value: unknown): string[] => {
  const shape = (schema as { shape?: Record<string, unknown> }).shape;
  if (!shape || typeof value !== "object" || value === null || Array.isArray(value)) return [];
  return Object.keys(value).filter((key) => !(key in shape));
};

export type ValidateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: ValidationIssue[] };

export type ParseResult =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly issues: ValidationIssue[] };

/**
 * Parse `value`; unknown keys count as `unrecognized_keys` issues. On success `data` is the
 * parsed output (trimmed strings, coerced numbers), which handlers consume. Never throws.
 */
export const parseAgainst = (schema: z.ZodType, value: unknown): ParseResult => {
  const result = schema.safeParse(value);
  const issues = result.success ? [] : issuesFromZodError(result.error);
  const seen = new Set(issues.map((issue) => `${issue.path}:${issue.code}`));
  for (const key of unknownKeys(schema, value)) {
    if (seen.has(`${key}:unrecognized_keys`)) continue;
    issues.push({ path: key, code: "unrecognized_keys", message: "Unknown field" });
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, data: result.success ? result.data : value };
};

/** Validate `value` (see `parseAgainst`) without returning the parsed output. Never throws. */
export const checkAgainst = (schema: z.ZodType, value: unknown): ValidateResult => {
  const result = parseAgainst(schema, value);
  return result.ok ? { ok: true } : result;
};
