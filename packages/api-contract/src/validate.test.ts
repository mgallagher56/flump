import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkAgainst, issuesFromZodError, parseAgainst, unknownKeys } from "./validate.js";

describe("issuesFromZodError", () => {
  it('names an issue on the value itself "(root)", the path the backend contract check strips', () => {
    // apps/backend contract-shadow.interceptor.ts treats the path "(root)" as the body itself.
    const result = z.string().safeParse(12);
    if (result.success) throw new Error("expected a failure");
    expect(issuesFromZodError(result.error).map((issue) => issue.path)).toEqual(["(root)"]);
  });
});

describe("unknownKeys", () => {
  const schema = z.object({ name: z.string() });

  it("reports keys only for a plain object, never the characters of a string", () => {
    expect(unknownKeys(schema, "abc")).toEqual([]);
    expect(unknownKeys(schema, { name: "a", extra: 1 })).toEqual(["extra"]);
  });

  it("reports nothing for null, without throwing", () => {
    expect(unknownKeys(schema, null)).toEqual([]);
  });
});

describe("parseAgainst", () => {
  it("never throws on a null body: it answers with the issues", () => {
    const result = parseAgainst(z.object({ name: z.string() }), null);
    expect(result.ok).toBe(false);
  });

  it("reports an unknown key on a strict schema once, not once from zod and once again", () => {
    const result = checkAgainst(z.strictObject({ name: z.string() }), { name: "a", extra: 1 });
    if (result.ok) throw new Error("expected a failure");
    expect(result.issues.map((issue) => [issue.path, issue.code])).toEqual([
      ["extra", "unrecognized_keys"],
    ]);
  });
});
