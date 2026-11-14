import { mkdir } from "node:fs/promises";
import { chromium, type FullConfig } from "@playwright/test";
import { AUTH_STATE } from "./auth";
import { applyPersona } from "./personas";

/**
 * Signs in through the real `/login` route (test-only cookie session), seeds the homeowner persona
 * (support/personas.ts) through the same-origin `/api` proxy, then saves the browser state for the
 * authenticated tests. No token is read or written here: the proxy attaches it server-side.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
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
