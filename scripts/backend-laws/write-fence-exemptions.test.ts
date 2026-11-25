import { describe, expect, test } from "bun:test";
import {
  ALLOWED_CALLERS,
  DEFINING_FILE,
  findFenceExemptionViolations,
  isCoveredFile,
  scanFenceExemptions,
} from "./check-write-fence-exemptions";

const OTHER = "apps/backend/src/modules/budget/budget.service.ts";
const LISTED = "apps/backend/src/modules/privacy/account-deletion.service.ts";

const lines = (file: string, source: string) =>
  findFenceExemptionViolations(file, source).map((v) => v.line);

describe("write-fence exemption law (F1)", () => {
  test("the live backend has no unlisted caller", () => {
    expect(scanFenceExemptions()).toEqual([]);
  });

  test("the allow-list stays short and every entry names its reason", () => {
    expect(Object.keys(ALLOWED_CALLERS).sort()).toEqual([
      "apps/backend/src/modules/privacy/account-deletion.service.ts",
      "apps/backend/src/modules/privacy/account-export.service.ts",
      "apps/backend/src/modules/profile/user-profile.service.ts",
    ]);
    for (const entry of Object.values(ALLOWED_CALLERS)) {
      expect(entry.calls).toBe(1);
      expect(entry.reason.length).toBeGreaterThan(10);
    }
  });

  test("flags a call, an import and an alias in a file that is not listed", () => {
    const source = [
      'import { withoutWriteFence } from "../privacy/user-data-lock";',
      'import { withoutWriteFence as unfenced } from "../privacy/user-data-lock";',
      "const run = () => withoutWriteFence(() => save());",
      "const generic = withoutWriteFence<number>(() => 1);",
    ].join("\n");
    expect(lines(OTHER, source)).toEqual([1, 2, 3, 4]);
  });

  test("ignores a mention in a line comment or a block comment", () => {
    const source = [
      "// runs withoutWriteFence, see the erasure",
      "/* withoutWriteFence(() => x) */",
      "/**",
      " * Not withoutWriteFence(...): fenced.",
      " */",
      "const a = 1; // withoutWriteFence",
    ].join("\n");
    expect(lines(OTHER, source)).toEqual([]);
  });

  test("allows a listed file its calls and flags one more", () => {
    const one = [
      'import { lockUserData, withoutWriteFence } from "./user-data-lock";',
      "return withoutWriteFence(() => this.erase(userId));",
    ].join("\n");
    expect(lines(LISTED, one)).toEqual([]);
    expect(lines(LISTED, `${one}\nawait withoutWriteFence(() => other());`)).toEqual([3]);
  });

  test("covers production backend source only", () => {
    expect(isCoveredFile(OTHER)).toBe(true);
    expect(isCoveredFile(DEFINING_FILE)).toBe(false);
    expect(isCoveredFile("apps/backend/src/modules/privacy/user-data.integration.spec.ts")).toBe(
      false,
    );
    expect(isCoveredFile("apps/backend/src/testing/emptyTables.ts")).toBe(false);
    expect(isCoveredFile("apps/backend/src/modules/privacy/README.md")).toBe(false);
  });
});
