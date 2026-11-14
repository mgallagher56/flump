import type { Page } from "@playwright/test";
import { FROZEN_NOW, SERVER_CLOCK_FROZEN } from "./clock";

/**
 * When the servers run under a frozen clock they started at FROZEN_NOW and have ticked since:
 * take their current time from the Date header so the browser agrees with the server-rendered
 * dates when it hydrates. A no-op when the servers keep the real clock.
 */
export async function syncBrowserClock(page: Page): Promise<void> {
  if (!SERVER_CLOCK_FROZEN) return;
  const ping = await page.request.get("/healthz");
  const serverDate = ping.headers().date;
  await page.clock.install({ time: serverDate ? new Date(serverDate) : new Date(FROZEN_NOW) });
}

/** Waits until the page has stopped changing: network quiet, web fonts in, layout settled. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Two frames, so ResizeObserver-driven charts have drawn at their final size.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

export interface HorizontalOverflow {
  scrollWidth: number;
  viewport: number;
  /** Up to five elements that stick out past the viewport, described for a failure message. */
  culprits: string[];
}

/** Elements wider than the viewport, described for the failure message. */
export function horizontalOverflow(page: Page): Promise<HorizontalOverflow> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const viewport = root.clientWidth;
    if (root.scrollWidth <= viewport)
      return { scrollWidth: root.scrollWidth, viewport, culprits: [] };
    const culprits = [...document.body.querySelectorAll<HTMLElement>("*")]
      .filter((el) => el.getBoundingClientRect().right > viewport + 1)
      .slice(0, 5)
      .map((el) => {
        const id = el.id ? `#${el.id}` : "";
        const cls =
          typeof el.className === "string" && el.className ? `.${el.className.split(" ")[0]}` : "";
        return `${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(el.getBoundingClientRect().right)}`;
      });
    return { scrollWidth: root.scrollWidth, viewport, culprits };
  });
}
