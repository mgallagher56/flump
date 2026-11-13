import { mkdir } from "node:fs/promises";
import { chromium, type FullConfig } from "@playwright/test";
import { AUTH_STATE } from "./auth";

/** Idempotent seed data for the single dev-bypass user (net worth is the sum of these). */
const ACCOUNTS = [
  { name: "E2E Current", type: "Current", balance: 5000, currency: "GBP" },
  { name: "E2E Savings", type: "Saving", balance: 10000, currency: "GBP", interestRate: 4 },
  { name: "E2E Mortgage", type: "Mortgage", balance: 200000, currency: "GBP", interestRate: 4.5 },
];

/**
 * Signs in through the real `/login` route (test-only cookie session), completes onboarding and
 * seeds two accounts through the same-origin `/api` proxy, then saves the browser state for the
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

    const seeded = await page.evaluate(async (accounts) => {
      const call = (path: string, method: string, body?: unknown) =>
        fetch(`/api${path}`, {
          method,
          headers: { "Content-Type": "application/json", "x-flump-request": "1" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      const profile = await call("/user-profile", "PATCH", { onboardingCompleted: true });
      const existing = await call("/accounts", "GET");
      const current = existing.ok ? ((await existing.json()) as { name: string }[]) : [];
      const created: number[] = [];
      for (const account of accounts) {
        if (current.some((row) => row.name === account.name)) continue;
        created.push((await call("/accounts", "POST", account)).status);
      }
      return { profile: profile.status, listed: existing.status, created };
    }, ACCOUNTS);

    if (seeded.profile !== 200 || seeded.listed !== 200 || seeded.created.some((s) => s >= 300)) {
      throw new Error(`Seeding through /api failed: ${JSON.stringify(seeded)}`);
    }

    await mkdir(new URL(".", `file://${AUTH_STATE}`).pathname, { recursive: true });
    await context.storageState({ path: AUTH_STATE });
  } finally {
    await browser.close();
  }
}
