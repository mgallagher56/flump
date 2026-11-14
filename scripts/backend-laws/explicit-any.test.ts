import { describe, expect, test } from "bun:test";
import { listLaws } from "../check-backend-laws";
import { compareAnyCounts, countExplicitAny, isCountedFile } from "../lib/explicit-any";

const diag = (path: string, category = "lint/suspicious/noExplicitAny") => ({
  category,
  location: { path },
});

describe("explicit any ratchet (BE-01, M21)", () => {
  test("counts only production backend source", () => {
    expect(isCountedFile("apps/backend/src/modules/finance/finance.service.ts")).toBe(true);
    expect(isCountedFile("apps/backend/src/modules/finance/finance.service.spec.ts")).toBe(false);
    expect(isCountedFile("apps/backend/src/testing/db.ts")).toBe(false);
    expect(isCountedFile("apps/web/app/root.tsx")).toBe(false);
  });

  test("counts noExplicitAny diagnostics per file and ignores other rules", () => {
    const counts = countExplicitAny({
      diagnostics: [
        diag("apps/backend/src/b.ts"),
        diag("apps/backend/src/a.ts"),
        diag("apps/backend/src/a.ts"),
        diag("apps/backend/src/a.ts", "lint/style/useConst"),
        diag("apps/backend/src/a.spec.ts"),
      ],
    });
    expect(counts).toEqual({ "apps/backend/src/a.ts": 2, "apps/backend/src/b.ts": 1 });
  });

  test("a new any fails; a file new to the baseline is allowed zero", () => {
    const r = compareAnyCounts({ "a.ts": 3, "new.ts": 1 }, { "a.ts": 2 });
    expect(r.increases).toEqual([
      "a.ts: 3 explicit any, baseline allows 2",
      "new.ts: 1 explicit any, baseline allows 0",
    ]);
  });

  test("fewer any never fails, it is reported as a decrease", () => {
    const r = compareAnyCounts({ "a.ts": 1 }, { "a.ts": 2, "gone.ts": 4 });
    expect(r.increases).toEqual([]);
    expect(r.decreases).toEqual(["a.ts: baseline 2, now 1", "gone.ts: baseline 4, now 0"]);
  });
});

describe("backend laws runner", () => {
  test("runs check-*.ts law files only, sorted, never tests or baselines", () => {
    expect(
      listLaws([
        "explicit-any-baseline.json",
        "check-z.ts",
        "explicit-any.test.ts",
        "check-explicit-any.ts",
        "check-explicit-any.test.ts",
        "README.md",
      ]),
    ).toEqual(["check-explicit-any.ts", "check-z.ts"]);
  });
});
