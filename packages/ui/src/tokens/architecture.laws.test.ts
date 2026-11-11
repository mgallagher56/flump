import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const UI_SRC = path.resolve(__dirname, "..");
const FOUNDATIONS_DIR = path.join(UI_SRC, "foundations");
const PRIMITIVES_DIR = path.join(UI_SRC, "primitives");
const PATTERNS_DIR = path.join(UI_SRC, "patterns");
const CALCULATORS_DIR = path.join(UI_SRC, "calculators");
const DEBT_FEATURES_DIR = path.resolve(
  __dirname,
  "../../../../apps/web/app/features/debt/components",
);
const SANDBOX_FEATURES_DIR = path.resolve(
  __dirname,
  "../../../../apps/web/app/features/sandbox/components",
);
const AI_CONNECTIONS_FEATURES_DIR = path.resolve(
  __dirname,
  "../../../../apps/web/app/features/ai-connections/components",
);
const FEEDBACK_FEATURES_DIR = path.resolve(
  __dirname,
  "../../../../apps/web/app/features/feedback/components",
);
const MARKETING_COMPONENTS_DIR = path.resolve(
  __dirname,
  "../../../../apps/marketing/src/components",
);
const MARKETING_PAGES_DIR = path.resolve(__dirname, "../../../../apps/marketing/src/pages");

function getSubdirectories(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function verifyColocatedStructure(baseDir: string, componentName: string) {
  const dir = path.join(baseDir, componentName);
  const files = fs.readdirSync(dir);

  expect(files, `Component ${componentName} must contain ${componentName}.tsx`).toContain(
    `${componentName}.tsx`,
  );

  expect(files, `Component ${componentName} must contain ${componentName}.styles.ts`).toContain(
    `${componentName}.styles.ts`,
  );

  expect(files, `Component ${componentName} must contain ${componentName}.stories.tsx`).toContain(
    `${componentName}.stories.tsx`,
  );

  expect(files, `Component ${componentName} must contain ${componentName}.test.tsx`).toContain(
    `${componentName}.test.tsx`,
  );

  expect(files, `Component ${componentName} must contain index.ts`).toContain("index.ts");
}

describe("Architecture & Design System Laws", () => {
  describe("1. Colocated Component Directory Law", () => {
    it("enforces colocated structure for all foundations", () => {
      const foundations = getSubdirectories(FOUNDATIONS_DIR);
      expect(foundations.length).toBeGreaterThanOrEqual(3);
      for (const comp of foundations) {
        verifyColocatedStructure(FOUNDATIONS_DIR, comp);
      }
    });

    it("enforces colocated structure for all primitives", () => {
      const primitives = getSubdirectories(PRIMITIVES_DIR);
      expect(primitives.length).toBeGreaterThanOrEqual(9);
      for (const comp of primitives) {
        verifyColocatedStructure(PRIMITIVES_DIR, comp);
      }
    });

    it("enforces colocated structure for all layout patterns", () => {
      const patterns = getSubdirectories(PATTERNS_DIR);
      expect(patterns.length).toBeGreaterThanOrEqual(9);
      for (const comp of patterns) {
        verifyColocatedStructure(PATTERNS_DIR, comp);
      }
    });

    it("enforces colocated structure for features/debt components", () => {
      if (fs.existsSync(DEBT_FEATURES_DIR)) {
        const debtComponents = getSubdirectories(DEBT_FEATURES_DIR);
        expect(debtComponents.length).toBeGreaterThanOrEqual(2);
        for (const comp of debtComponents) {
          verifyColocatedStructure(DEBT_FEATURES_DIR, comp);
        }
      }
    });

    it("enforces colocated structure for all calculators", () => {
      const calculators = getSubdirectories(CALCULATORS_DIR);
      expect(calculators.length).toBeGreaterThanOrEqual(7);
      for (const comp of calculators) {
        verifyColocatedStructure(CALCULATORS_DIR, comp);
      }
    });

    it("enforces colocated structure for features/sandbox components", () => {
      if (fs.existsSync(SANDBOX_FEATURES_DIR)) {
        const sandboxComponents = getSubdirectories(SANDBOX_FEATURES_DIR);
        expect(sandboxComponents.length).toBeGreaterThanOrEqual(1);
        for (const comp of sandboxComponents) {
          verifyColocatedStructure(SANDBOX_FEATURES_DIR, comp);
        }
      }
    });

    it("enforces colocated structure for features/ai-connections components", () => {
      if (fs.existsSync(AI_CONNECTIONS_FEATURES_DIR)) {
        const aiComponents = getSubdirectories(AI_CONNECTIONS_FEATURES_DIR);
        expect(aiComponents.length).toBeGreaterThanOrEqual(1);
        for (const comp of aiComponents) {
          verifyColocatedStructure(AI_CONNECTIONS_FEATURES_DIR, comp);
        }
      }
    });

    it("enforces colocated structure for features/feedback components", () => {
      if (fs.existsSync(FEEDBACK_FEATURES_DIR)) {
        const feedbackComponents = getSubdirectories(FEEDBACK_FEATURES_DIR);
        expect(feedbackComponents.length).toBeGreaterThanOrEqual(1);
        for (const comp of feedbackComponents) {
          verifyColocatedStructure(FEEDBACK_FEATURES_DIR, comp);
        }
      }
    });

    it("enforces colocated structure for new marketing MCP components and pages", () => {
      verifyColocatedStructure(MARKETING_COMPONENTS_DIR, "McpSpotlightSection");
      verifyColocatedStructure(MARKETING_PAGES_DIR, "McpPage");
    });
  });

  describe("2. Design Token Boundaries Law", () => {
    it("ensures no new/consolidated component files reference deprecated semantic token paths", () => {
      const targetDirs = [
        FOUNDATIONS_DIR,
        PRIMITIVES_DIR,
        PATTERNS_DIR,
        CALCULATORS_DIR,
        AI_CONNECTIONS_FEATURES_DIR,
        MARKETING_COMPONENTS_DIR,
        MARKETING_PAGES_DIR,
      ];
      const deprecatedPatterns = [
        "financial.positive",
        "financial.negative",
        "financial.warning",
        "card.DEFAULT",
        "canvas.DEFAULT",
        "popover.DEFAULT",
        "text.destructive",
      ];

      for (const targetDir of targetDirs) {
        const subdirs = getSubdirectories(targetDir);
        for (const subdir of subdirs) {
          const compDir = path.join(targetDir, subdir);
          const files = fs
            .readdirSync(compDir)
            .filter((f) => f.endsWith(".tsx") || f.endsWith(".styles.ts"));

          for (const file of files) {
            const content = fs.readFileSync(path.join(compDir, file), "utf-8");
            for (const dep of deprecatedPatterns) {
              expect(
                content.includes(dep),
                `File ${file} in ${subdir} should not reference deprecated token "${dep}"`,
              ).toBe(false);
            }
          }
        }
      }
    });

    it("ensures colocated MCP components in web and marketing contain zero inline style props, raw hex colours, or primitive token scales", () => {
      const strictDirs = [
        path.join(AI_CONNECTIONS_FEATURES_DIR, "McpConnectionCard"),
        path.join(MARKETING_COMPONENTS_DIR, "McpSpotlightSection"),
        path.join(MARKETING_PAGES_DIR, "McpPage"),
      ];
      const forbiddenTokens = ["var(--colors-", "style={{"];
      const primitiveTokenRegex = /\b(slate|indigo|emerald|amber|red|purple|cyan)\.[0-9]{2,3}\b/;
      const hexColorRegex = /#[0-9a-fA-F]{3,8}\b/;

      for (const compDir of strictDirs) {
        const files = fs
          .readdirSync(compDir)
          .filter(
            (f) =>
              (f.endsWith(".tsx") && !f.endsWith(".stories.tsx") && !f.endsWith(".test.tsx")) ||
              f.endsWith(".styles.ts"),
          );

        for (const file of files) {
          const content = fs.readFileSync(path.join(compDir, file), "utf-8");
          for (const forbidden of forbiddenTokens) {
            expect(
              content.includes(forbidden),
              `File ${file} in ${path.basename(compDir)} must not use forbidden pattern "${forbidden}"`,
            ).toBe(false);
          }
          expect(
            primitiveTokenRegex.test(content),
            `File ${file} in ${path.basename(compDir)} must not reference primitive token scales`,
          ).toBe(false);
          expect(
            hexColorRegex.test(content),
            `File ${file} in ${path.basename(compDir)} must not contain raw hex color values`,
          ).toBe(false);
        }
      }
    });
    it("no component uses status.*.solid as a text colour", () => {
      // status.*.solid is a fill/graphic colour (3:1, SC 1.4.11). As text it is only guaranteed
      // when paired with text.onContrast. Use status.*.text for text. Icons are graphics, so
      // they may use solid. Paths are relative to the repo root.
      const ALLOWED: Record<string, string> = {
        "apps/web/app/features/debt/components/PromoCliffTracker/PromoCliffTracker.tsx":
          "icon (graphic)",
        "apps/web/app/features/debt/components/PayoffStrategyControls/PayoffStrategyControls.tsx":
          "icon (graphic)",
        "apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.styles.ts":
          "bulletIcon recipe, applied to icon components only (graphic)",
        // Known sites pending fixes. Remove each entry when the site moves to status.*.text.
        "apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx":
          "Revoke button text, pending the web sweep: must move to status.danger.text",
        "packages/ui/src/patterns/TaxTrapEscapeBanner/TaxTrapEscapeBanner.tsx":
          "saving figure text, pending fix: must move to status.positive.text",
      };
      const repoRoot = path.resolve(__dirname, "../../../..");
      const roots = [path.join(repoRoot, "packages/ui/src")];
      for (const app of ["web", "marketing", "mobile-companion"]) {
        for (const sub of ["src", "app"]) roots.push(path.join(repoRoot, "apps", app, sub));
      }
      const files: string[] = [];
      const walk = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === "node_modules" || entry.name === "styled-system") continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name))
            files.push(full);
        }
      };
      for (const root of roots) walk(root);
      expect(files.length).toBeGreaterThan(100);

      const textSolid = /\bcolor:\s*["']status\.[a-zA-Z]+\.solid["']/;
      const offenders = files
        .filter((f) => textSolid.test(fs.readFileSync(f, "utf-8")))
        .map((f) => path.relative(repoRoot, f));
      const unexpected = offenders.filter((f) => !(f in ALLOWED));
      expect(
        unexpected,
        `status.*.solid used as text colour (use status.*.text): ${unexpected.join(", ")}`,
      ).toEqual([]);
      // Stale allowlist entries must be removed once the site is fixed.
      const stale = Object.keys(ALLOWED).filter((f) => !offenders.includes(f));
      expect(stale, `Allowlist entries no longer match: ${stale.join(", ")}`).toEqual([]);
    });
  });
});
