import { describe, expect, test } from "bun:test";
import { countEmDashes, isDashCheckedFile } from "./lib/doc-dashes";

describe("countEmDashes on real past lines", () => {
  test("docs/agents/ui-laws.md before this fix", () => {
    const line =
      "- `ComponentName/ComponentName.styles.ts` (Panda CSS `cva` or `sva` recipes—no inline style soup)";
    expect(countEmDashes(line)).toBe(1);
  });

  test(".claude/agents/implementer.md before this fix", () => {
    expect(
      countEmDashes("- Semantic design tokens only — no raw hex or primitive scale tokens."),
    ).toBe(1);
  });

  test("the fixed lines have none; an en dash or hyphen is not an em dash", () => {
    expect(countEmDashes("recipes, no inline style soup; 2020–2021; well-known")).toBe(0);
  });
});

describe("isDashCheckedFile", () => {
  test("Markdown anywhere, agent rules and .cursorrules are checked", () => {
    for (const f of [
      "AGENTS.md",
      "docs/audit/plans/E37-plan.md",
      ".claude/skills/x/SKILL.md",
      ".cursorrules",
    ])
      expect(isDashCheckedFile(f)).toBe(true);
  });

  test("release-please changelogs and code are not", () => {
    for (const f of ["CHANGELOG.md", "apps/web/CHANGELOG.md", "apps/web/app/root.tsx"])
      expect(isDashCheckedFile(f)).toBe(false);
  });
});
