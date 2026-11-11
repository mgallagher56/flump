import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

// Every `outline: "none"` in a Panda css() block must come with an explicit focus style within
// WINDOW lines (the unlayered focus rule in index.css is only a safety net). Dialog and modal
// containers that take programmatic focus are allowlisted by file; they opt out of the safety net
// with `data-focus-managed`.
const ALLOWLIST: string[] = [
  "components/budget/UserProfilePanel.tsx",
  "components/core/dialogs/FLPModal.tsx",
  "components/core/dialogs/TaxDisclaimerButton.tsx",
  "components/dashboard/WidgetSettingsModal.tsx",
  "components/dialogs/connectBankWizard/ConnectBankWizard.tsx",
  "components/tax/CopyTaxYearModal.tsx",
  "features/feedback/components/ConfirmDialog/ConfirmDialog.styles.ts",
];

const APP_DIR = path.resolve(__dirname, "..");
const WINDOW = 25;
const OUTLINE_NONE = /outline:\s*["'`](none|0)["'`]/;
const FOCUS_STYLE = /_focus|_focusVisible|&:focus|:focus-visible|focus-within|_focusWithin/;

const walk = (dir: string, files: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") walk(full, files);
    } else if (/\.tsx?$/.test(full) && !/\.(test|stories)\.tsx?$/.test(full)) {
      files.push(full);
    }
  }
  return files;
};

const findViolations = (file: string): string[] => {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const found: string[] = [];
  lines.forEach((line, i) => {
    if (!OUTLINE_NONE.test(line)) return;
    const nearby = lines.slice(Math.max(0, i - WINDOW), i + WINDOW + 1).join("\n");
    if (!FOCUS_STYLE.test(nearby)) found.push(`${path.relative(APP_DIR, file)}:${i + 1}`);
  });
  return found;
};

describe("focus ratchet", () => {
  test("outline: none always has an explicit focus style nearby", () => {
    const violations = walk(APP_DIR)
      .filter((f) => !ALLOWLIST.includes(path.relative(APP_DIR, f)))
      .flatMap(findViolations);
    expect(violations).toEqual([]);
  });
});
