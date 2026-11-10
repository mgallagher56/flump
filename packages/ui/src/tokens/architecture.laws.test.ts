import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const UI_SRC = path.resolve(__dirname, "..");
const FOUNDATIONS_DIR = path.join(UI_SRC, "foundations");
const PRIMITIVES_DIR = path.join(UI_SRC, "primitives");
const PATTERNS_DIR = path.join(UI_SRC, "patterns");
const DEBT_FEATURES_DIR = path.resolve(
  __dirname,
  "../../../../apps/web/app/features/debt/components",
);
const SANDBOX_FEATURES_DIR = path.resolve(__dirname, "../../../../apps/web/app/features/sandbox");

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

    it("enforces colocated structure for features/sandbox components", () => {
      if (fs.existsSync(SANDBOX_FEATURES_DIR)) {
        const sandboxComponents = getSubdirectories(SANDBOX_FEATURES_DIR);
        expect(sandboxComponents.length).toBeGreaterThanOrEqual(1);
        for (const comp of sandboxComponents) {
          verifyColocatedStructure(SANDBOX_FEATURES_DIR, comp);
        }
      }
    });
  });

  describe("2. Design Token Boundaries Law", () => {
    it("ensures no new/consolidated component files reference deprecated semantic token paths", () => {
      const targetDirs = [FOUNDATIONS_DIR, PRIMITIVES_DIR, PATTERNS_DIR];
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
  });
});
