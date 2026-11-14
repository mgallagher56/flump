import { describe, expect, test } from "bun:test";
import { compareToBaseline } from "./lib/design-tokens";
import { countNumberInputs } from "./lib/input-types";
import { countJudgementUses, isJudgementAllowed, JUDGEMENT_ALLOW_LIST } from "./lib/judgement";

describe("countNumberInputs (K1, UX-GUIDELINES F2)", () => {
  test("counts JSX attributes in every quoting form", () => {
    const src = `<input type="number" /><input type='number' /><TextInput type={"number"} /><X type={ 'number' } />`;
    expect(countNumberInputs(src)).toBe(4);
  });
  test("counts a props object entry", () => {
    expect(countNumberInputs(`const props = { type: "number", min: 0 };`)).toBe(1);
  });
  test("ignores CSS attribute selectors and other attribute names", () => {
    const src = `css({ "&[type='number']": { appearance: "none" } }); const s = 'input[type="number"]'; <X inputType="number" data-type="number" />`;
    expect(countNumberInputs(src)).toBe(0);
  });
  test("ignores other types, comments and prose", () => {
    const src = `<input type="text" inputMode="decimal" />\n// never use type="number"\n/* type: "number" */\nconst s = "no number inputs";`;
    expect(countNumberInputs(src)).toBe(0);
  });
  test("ratchets via compareToBaseline: cannot grow, new files fail, drops are reported (the scripts pass on a drop)", () => {
    expect(compareToBaseline({ "a.tsx": 2 }, { "a.tsx": 1 }).failures).toHaveLength(1);
    expect(compareToBaseline({ "new.tsx": 1 }, {}).failures).toHaveLength(1);
    expect(compareToBaseline({ "a.tsx": 1 }, { "a.tsx": 2 }).stale).toHaveLength(1);
  });
});

describe("countJudgementUses (K11, UX-GUIDELINES T2)", () => {
  test("counts status.danger and status.warning tokens in any form", () => {
    const src = `css({ color: "status.danger.text", bg: "status.warning.bg" }); token("colors.status.danger.solid")`;
    expect(countJudgementUses(src)).toBe(3);
  });
  test("ignores the other status tones and comments", () => {
    const src = `css({ color: "status.positive.text", bg: "status.info.bg", b: "status.neutral.border" });\n// status.danger is for errors`;
    expect(countJudgementUses(src)).toBe(0);
  });
  test("counts each reference to an alarm icon imported from lucide-react", () => {
    const src = `import { CalendarCheck, Flame, TriangleAlert as Warn } from "lucide-react";\n<Icon icon={Flame} /> <Icon icon={Warn} /> <Icon icon={Warn} />`;
    expect(countJudgementUses(src)).toBe(3);
  });
  test("covers the legacy AlertTriangle alias and the *Icon exports", () => {
    const src = `import { AlertTriangle, SkullIcon, Siren } from "lucide-react";\n<AlertTriangle /><SkullIcon /><Siren />`;
    expect(countJudgementUses(src)).toBe(3);
  });
  test("ignores same-named identifiers not imported from lucide-react", () => {
    const src = `import { Flame } from "./local";\nconst x = <Flame />; const y = "Flame";`;
    expect(countJudgementUses(src)).toBe(0);
  });
  test("does not count the import itself or a property access", () => {
    expect(countJudgementUses(`import { Flame } from "lucide-react";\nicons.Flame;`)).toBe(0);
  });
  test("allow-list covers error and destructive components, each with a reason", () => {
    expect(isJudgementAllowed("packages/ui/src/primitives/InlineAlert/InlineAlert.styles.ts")).toBe(
      true,
    );
    expect(isJudgementAllowed("packages/ui/src/patterns/ConfirmDialog/ConfirmDialog.tsx")).toBe(
      true,
    );
    expect(
      isJudgementAllowed("apps/web/app/features/dashboard/components/DebtWidget/DebtWidget.tsx"),
    ).toBe(false);
    expect(isJudgementAllowed("packages/ui/src/primitives/Money/Money.styles.ts")).toBe(false);
    for (const entry of JUDGEMENT_ALLOW_LIST) {
      expect(entry.path.endsWith("/")).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(5);
    }
  });
});
