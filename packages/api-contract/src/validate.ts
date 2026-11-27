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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Paths of keys the parse filled in from a default, because `raw` did not have them. */
const defaultedPaths = (parsed: unknown, raw: unknown, path: string, out: string[]): void => {
  if (Array.isArray(parsed) && Array.isArray(raw)) {
    // Paths stay index-free, like every other issue path.
    for (const [i, item] of parsed.entries()) defaultedPaths(item, raw[i], path, out);
    return;
  }
  if (!isPlainObject(parsed) || !isPlainObject(raw)) return;
  for (const [key, value] of Object.entries(parsed)) {
    const at = path === "" ? key : `${path}.${key}`;
    if (!(key in raw)) {
      if (!out.includes(at)) out.push(at);
    } else defaultedPaths(value, raw[key], at, out);
  }
};

/**
 * The server's own check of a response it sends (the backend's contract-shadow interceptor).
 * Like `parseAgainst`, and stricter in one way: a field the contract gives a reader default
 * (`.default(...)`, docs/api/versioning.md) must still be sent, so a key the parse filled in is
 * a `missing_field` issue. Readers keep the default; only the producer is held to the full shape.
 */
export const checkServerResponse = (schema: z.ZodType, value: unknown): ValidateResult => {
  const result = parseAgainst(schema, value);
  if (!result.ok) return result;
  const missing: string[] = [];
  defaultedPaths(result.data, value, "", missing);
  if (missing.length === 0) return { ok: true };
  return {
    ok: false,
    issues: missing.map((path) => ({
      path,
      code: "missing_field",
      message: "Sent without a field the contract gives a reader default",
    })),
  };
};
