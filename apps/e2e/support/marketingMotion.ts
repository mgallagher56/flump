import { expect, type Page } from "@playwright/test";

/*
 * Condition waits for the marketing pages' motion, shared by `marketing-home.spec.ts` (where PR 985
 * wrote them) and `marketing-pages.spec.ts`: scroll inside the page, then wait until what moves has
 * stopped moving, never a fixed sleep.
 */

/**
 * Scrolls `by` pixels in `steps` steps `gap` ms apart, inside the page. Scroll events drive every
 * trigger, so this sets off what a wheel does; Playwright's wheel waits for each scroll to be
 * acknowledged, about 0.4 s a step while the scene draws, so a run of wheels took most of a
 * test's time.
 */
export async function scrollInSteps(
  page: Page,
  by: number,
  steps: number,
  gap: number,
): Promise<void> {
  await page.evaluate(
    async (run) => {
      for (let step = 0; step < run.steps; step++) {
        window.scrollBy({ top: run.by / run.steps, behavior: "instant" });
        await new Promise((resolve) => setTimeout(resolve, run.gap));
      }
    },
    { by, steps, gap },
  );
}

/**
 * Waits until nothing in `selector` has changed for 1.2 s (more than a changeover's beat, 0.69 s):
 * each element's opacity (times its ancestors'), place on the page, visibility and, for a counting
 * figure, its text. A moment left running or stuck moving fails at `timeout`.
 */
export async function untilStill(page: Page, selector: string, timeout = 15_000): Promise<void> {
  let last = "";
  let since = Date.now();
  await expect
    .poll(
      async () => {
        const now = await page.locator(selector).evaluateAll((els) =>
          els
            .map((el) => {
              let opacity = 1;
              for (let node: Element | null = el; node; node = node.parentElement)
                opacity *= Number(getComputedStyle(node).opacity);
              const r = el.getBoundingClientRect();
              const text = el.hasAttribute("data-count") ? el.textContent : "";
              return `${opacity.toFixed(2)},${Math.round(r.left)},${Math.round(r.top + scrollY)},${getComputedStyle(el).visibility},${text}`;
            })
            .join(";"),
        );
        if (now !== last) {
          last = now;
          since = Date.now();
        }
        return Date.now() - since;
      },
      { timeout, intervals: [200], message: `${selector} still moving` },
    )
    .toBeGreaterThanOrEqual(1200);
}

/** Scrolls from the top to the page's foot a screen at a time, re-reading its length on the way. */
export async function scrollToFoot(page: Page): Promise<void> {
  for (let guard = 0; guard < 40; guard++) {
    const left = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
    );
    if (left <= 1) return;
    await scrollInSteps(page, Math.min(left, 700), 4, 40);
  }
}
