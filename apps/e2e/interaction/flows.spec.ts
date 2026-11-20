import { test } from "@playwright/test";
import { settle, syncBrowserClock, waitForHydration } from "../support/page";
import { Actor } from "./actor";
import { InteractionCounter } from "./counter";
import { FLOWS } from "./flows";
import { RUN_MODES, type RunMode } from "./report";
import { writeFragment } from "./store";

/**
 * The seven core flows in each mode (E38 S0). One worker, in this order: the flows share the
 * single dev user (see flows.ts). Each test records its cost as a fragment; global teardown
 * compares the run with docs/audit/interaction-cost/baseline.json and fails it only for a cost
 * above its budget (report.ts, costLimit).
 */
const DEVICE: Record<RunMode, Parameters<typeof test.use>[0]> = {
  "desktop-pointer": { viewport: { width: 1280, height: 800 } },
  "phone-touch": { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true },
  "desktop-keyboard": { viewport: { width: 1280, height: 800 } },
};

for (const mode of RUN_MODES) {
  test.describe(mode, () => {
    test.use(DEVICE[mode]);

    for (const flow of FLOWS) {
      test(flow.title, async ({ page }) => {
        const counter = await InteractionCounter.attach(page);
        await syncBrowserClock(page);
        await page.goto("/");
        await waitForHydration(page);
        await flow.prepare?.(page);
        await page.goto(flow.start);
        await waitForHydration(page);
        await settle(page);

        const actor = new Actor(page, mode, counter);
        await counter.start();
        await flow.run(actor);
        const cost = await counter.stop();
        writeFragment({ flow: flow.id, title: flow.title, mode, cost });
        test.info().annotations.push({ type: "cost", description: JSON.stringify(cost) });
      });
    }
  });
}
