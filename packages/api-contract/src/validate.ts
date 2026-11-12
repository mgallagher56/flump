import type { z } from "zod";

export interface ValidationIssue {
  /** Dotted field path, `[]`-free so it is stable and carries no values. */
  readonly path: string;
  readonly code: string;
}

/** Issues from a zod error, paths and codes only: values are personal data and never included. */
export const issuesFromZodError = (error: z.ZodError): ValidationIssue[] =>
  error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    code: issue.code,
  }));

/**
 * Keys present in a plain-object value that the schema does not declare. Zod strips them silently;
 * shadow mode reports them (E21 section 5.3: the web sends fields the backend drops).
 */
export const unknownKeys = (schema: z.ZodType, value: unknown): string[] => {
  const shape = (schema as { shape?: Record<string, unknown> }).shape;
  if (!shape || typeof value !== "object" || value === null || Array.isArray(value)) return [];
  return Object.keys(value).filter((key) => !(key in shape));
};

export type ValidateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: ValidationIssue[] };

/** Validate `value`; unknown keys count as `unrecognized_keys` issues. Never throws. */
export const checkAgainst = (schema: z.ZodType, value: unknown): ValidateResult => {
  const result = schema.safeParse(value);
  const issues = result.success ? [] : issuesFromZodError(result.error);
  for (const key of unknownKeys(schema, value)) {
    issues.push({ path: key, code: "unrecognized_keys" });
  }
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
};
