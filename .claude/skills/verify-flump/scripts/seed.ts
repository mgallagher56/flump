/**
 * Signs in through the real /login route (the test-only dev session cookie), writes a persona
 * from apps/e2e/support/personas.ts through the web app's /api proxy, and saves the browser
 * session for journeys. Called by `verify-flump up` and `verify-flump seed <persona>`.
 */
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { applyPersona, PERSONAS, type PersonaName } from "../../../../apps/e2e/support/personas";
import { requireEnv } from "./env.ts";

const persona = (process.argv[2] ?? "homeowner") as PersonaName;
if (!(persona in PERSONAS)) {
  console.error(`unknown persona ${persona}; one of: ${Object.keys(PERSONAS).join(", ")}`);
  process.exit(2);
}
const webUrl = requireEnv("VERIFY_WEB_URL");
const stateDir = requireEnv("VERIFY_STATE_DIR");

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ baseURL: webUrl });
  const page = await context.newPage();
  await page.goto("/login");
  await page.waitForURL((url) => url.origin === new URL(webUrl).origin);
  const result = await applyPersona(page, persona);
  console.log(`seeded ${persona}: ${JSON.stringify(result)}`);
  await context.storageState({ path: join(stateDir, "storage-state.json") });
} finally {
  await browser.close();
}
