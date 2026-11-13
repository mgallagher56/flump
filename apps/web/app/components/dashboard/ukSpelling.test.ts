import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// R-11: UI copy uses UK spellings (-ise/-ising), never US -ize/-izing. Scans the dashboard widget
// layer and the features/dashboard components, the sandbox route and the debt dialog. Only whole lowercase or Capitalised words match, so
// camelCase identifiers such as `fontSize` or `onToggleSize` are ignored.
const APP_DIR = path.resolve(__dirname, "../..");
const DASHBOARD_DIR = path.join(APP_DIR, "components/dashboard");
const DASHBOARD_FEATURE_DIR = path.join(APP_DIR, "features/dashboard");

const US_SPELLING = /\b[A-Z]?[a-z]{2,}(?:iz(?:e|es|ed|ing)|ization)\b/g;
// Legitimate words that merely end in -ize.
const ALLOWED = new Set(["resize", "resized", "resizes", "prize", "seize", "capsize", "baptize"]);

const collect = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    const isSource = /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name);
    return isSource ? [full] : [];
  });

// The finance engine names a lifecycle stage "stabilize"; that quoted key is code, not UI copy.
const ENGINE_STAGE_KEY = /"stabilize"/g;

const files = [
  ...collect(path.join(DASHBOARD_DIR, "widgets")),
  ...collect(DASHBOARD_FEATURE_DIR),
  path.join(DASHBOARD_DIR, "DashboardWidgetCard.tsx"),
  path.join(DASHBOARD_DIR, "WidgetSettingsModal.tsx"),
  path.join(APP_DIR, "components/debt/AddDebtDialog.tsx"),
  path.join(APP_DIR, "routes/sandbox.tsx"),
];

describe("UK spelling in widget, sandbox and debt dialog copy", () => {
  it("scans a non-empty set of files", () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it.each(files.map((f) => [path.relative(APP_DIR, f), f]))(
    "%s has no -ize/-izing spellings",
    (_name, file) => {
      const hits = (
        readFileSync(file, "utf8").replace(ENGINE_STAGE_KEY, '""').match(US_SPELLING) ?? []
      ).filter((word) => !ALLOWED.has(word.toLowerCase()));
      expect(hits).toEqual([]);
    },
  );

  it("covers the migrated dashboard widgets and keeps their labels unabbreviated", () => {
    const names = files.map((f) => path.basename(f));
    for (const widget of ["Accounts", "Budget", "Debt", "Savings"]) {
      expect(names).toContain(`${widget}Widget.tsx`);
    }
    for (const file of files.filter((f) => f.includes("features/dashboard"))) {
      expect(readFileSync(file, "utf8")).not.toMatch(/>\s*Liab\b|Customize\b/);
    }
  });

  it("replaced the abbreviated pension badge copy", () => {
    const pension = readFileSync(
      path.join(APP_DIR, "features/dashboard/components/PensionWidget/PensionWidget.tsx"),
      "utf8",
    );
    expect(pension).not.toContain("Sal Sacrifice");
    expect(pension).toContain("Salary sacrifice");
  });
});
