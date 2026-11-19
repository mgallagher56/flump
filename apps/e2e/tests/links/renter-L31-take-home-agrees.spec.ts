import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { linkSpecHeaders } from "../../support/client-address";
import { applyPersona, RENTER } from "../../support/personas";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

type DashboardData = {
  forecastData: { estimatedTakeHome: number | null };
};

const api = (page: Page, path: string, method = "GET", body?: unknown) =>
  page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", "x-flump-request": "1" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`${method} ${path} ${response.status}`);
      const text = await response.text();
      return (text ? JSON.parse(text) : null) as unknown;
    },
    { path, method, body },
  );

// The persona's take-home inputs, put back after each test (the proxy allows no GET of the
// profile, so applyPersona cannot tell whether an earlier test changed them).
const SAVED = {
  annualSalary: RENTER.profile.annualSalary,
  monthlyTakeHome: RENTER.profile.monthlyTakeHome,
  studentLoanPlans: RENTER.profile.studentLoanPlans,
  pensionPercent: RENTER.profile.pensionPercent,
  pensionEmployerPercent: RENTER.profile.pensionEmployerPercent,
  isSalarySacrifice: RENTER.profile.isSalarySacrifice,
};

const pounds = (value: number) => `£${value.toLocaleString("en-GB")}`;

/**
 * The Dashboard's estimated take-home. The Dashboard renders no take-home card today, so the
 * figure is read from its route data (routes/_index.tsx forecastData.estimatedTakeHome).
 */
const dashboardTakeHome = async (page: Page): Promise<number | null> => {
  await page.goto("/app");
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __reactRouterDataRouter?: unknown }).__reactRouterDataRouter),
  );
  return page.evaluate(() => {
    const router = (
      window as unknown as {
        __reactRouterDataRouter: { state: { loaderData: Record<string, unknown> } };
      }
    ).__reactRouterDataRouter;
    const data = router.state.loaderData["routes/_index"] as DashboardData | undefined;
    if (!data) throw new Error("no Dashboard route data");
    return data.forecastData.estimatedTakeHome;
  });
};

const heroPounds = async (page: Page) => {
  await page.goto("/app/take-home");
  const hero = page.getByTestId("hero-figure");
  await expect(hero).toContainText(/£[\d,]+/);
  const text = ((await hero.textContent()) ?? "").match(/£[\d,]+/)?.[0] ?? "";
  return { hero, text };
};

// L31 (slice 6): take-home is the same figure on the Dashboard and the Take-home page.
test.describe("L31 take-home agrees on the Dashboard and Take-home", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
    await applyPersona(page, "renter");
    await api(page, "/user-profile", "PATCH", SAVED);
  });

  test.afterEach(async ({ page }) => {
    await api(page, "/user-profile", "PATCH", SAVED);
  });

  // Worked by hand, 2026/27, England, net-pay pension (not salary sacrifice), Plan 2:
  // pension 32,000 x 5% = 1,600, taken before tax.
  // Income Tax (32,000 - 1,600 - 12,570) x 20% = 17,830 x 20% = 3,566.
  // NI on the full salary (32,000 - 12,570) x 8% = 1,554.40.
  // Student loan (32,000 - 29,385) x 9% = 235.35.
  // 32,000 - 1,600 - 3,566 - 1,554.40 - 235.35 = 25,044.25 a year; / 12 = 2,087.02, so £2,087.
  test("the renter's worked-out take-home is the same on both pages", async ({ page }) => {
    const { text } = await heroPounds(page);
    const now = new Date();
    const in2026to27 = now >= new Date("2026-04-06") && now < new Date("2027-04-06");
    if (in2026to27) expect(text).toBe("£2,087");

    const dashboard = await dashboardTakeHome(page);
    expect(dashboard).not.toBeNull();
    expect(pounds(Math.round(dashboard as number))).toBe(text);
  });

  // A typed take-home with no salary is the take-home itself (owner decision 2 option A): £2,500
  // a month as entered, on both pages.
  test("a typed take-home with no salary is £2,500 a month on both pages", async ({ page }) => {
    await api(page, "/user-profile", "PATCH", { annualSalary: null, monthlyTakeHome: 2500 });

    const { hero, text } = await heroPounds(page);
    expect(text).toBe("£2,500");
    await expect(hero).toContainText("The take-home pay you entered");

    expect(await dashboardTakeHome(page)).toBe(2500);
  });
});
