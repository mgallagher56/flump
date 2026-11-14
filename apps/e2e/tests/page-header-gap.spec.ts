import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { waitForHydration } from "../support/page";

/**
 * Every app page puts the same space between its header and the first thing under it (P13: the
 * PageBody section gap, 32px). A page outside PageBody, or one whose header keeps its own bottom
 * margin, shows a different gap.
 */
const PAGES = [
  "/app/accounts",
  "/app/budget",
  "/app/take-home",
  "/app/savings",
  "/app/pension",
  "/app/debt",
  "/app/mortgage",
];

const GAP = 32;

for (const width of [1280, 390]) {
  test.describe(`header gap at ${width}px`, () => {
    test.use({ storageState: AUTH_STATE, viewport: { width, height: 900 } });

    for (const path of PAGES) {
      test(`${path} keeps ${GAP}px under its header`, async ({ page }) => {
        await page.goto(path);
        await waitForHydration(page);
        const header = page
          .locator("main header")
          .filter({ has: page.locator("h1") })
          .first();
        await expect(header).toBeVisible();
        const gap = await header.evaluate((el) => {
          // The next element drawn after the header, wherever it sits in the tree.
          const bottom = el.getBoundingClientRect().bottom;
          let node: Element | null = el;
          while (node && !node.nextElementSibling) node = node.parentElement;
          let next = node?.nextElementSibling ?? null;
          while (next) {
            const box = next.getBoundingClientRect();
            if (box.height > 0 && getComputedStyle(next).display !== "none") {
              return Math.round(box.top - bottom);
            }
            next = next.nextElementSibling;
          }
          return Number.NaN;
        });
        expect(gap, `${path} header gap at ${width}px`).toBe(GAP);
      });
    }
  });
}
