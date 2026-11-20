import { rmSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { chromium, type FullConfig } from "@playwright/test";
import { AUTH_STATE } from "./auth";
import { applyPersona } from "./personas";
import { SPEC_MARKS } from "./read-budget";

/**
 * Signs in through the real `/login` route (test-only cookie session), seeds the homeowner persona
 * (support/personas.ts) through the same-origin `/api` proxy, then saves the browser state for the
 * authenticated tests. No token is read or written here: the proxy attaches it server-side.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  // A fresh list of link-spec marks for this run (read-budget.ts; the backend log is truncated by
  // stamp-log.ts when the server starts).
  rmSync(SPEC_MARKS, { force: true });
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error("baseURL is required");

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto("/login");
    await page.waitForURL((url) => url.origin === new URL(baseURL).origin);

    await applyPersona(page, "homeowner");

    await mkdir(new URL(".", `file://${AUTH_STATE}`).pathname, { recursive: true });
    await context.storageState({ path: AUTH_STATE });
  } finally {
    await browser.close();
  }
}
