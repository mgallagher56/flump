import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona, RENTER } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

type PensionProfile = {
  pensionPercent: number | null;
  pensionEmployerPercent: number | null;
  isSalarySacrifice: boolean | null;
};

type DashboardData = {
  pensionData: {
    employeePercent: number | null;
    employerPercent: number | null;
    isSalarySacrifice: boolean | null;
  };
  forecastData: { estimatedTakeHome: number | null; takeHomeMissing?: string };
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

// The browser proxy allows no GET of the profile, so the persona's own values are put back.
const SAVED: PensionProfile = {
  pensionPercent: RENTER.profile.pensionPercent as number,
  pensionEmployerPercent: RENTER.profile.pensionEmployerPercent as number,
  isSalarySacrifice: RENTER.profile.isSalarySacrifice as boolean,
};

/**
 * The Dashboard's loaded figures. For the renter the KPI strip shows the debt, so the pension
 * card shows the pots and not the rates (PensionWidget potInStrip=false); the rates the
 * Dashboard holds are read from its route data, the data its cards render from.
 */
const dashboardData = async (page: Page): Promise<DashboardData> => {
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
    const data = router.state.loaderData["routes/_index"];
    if (!data) throw new Error("no Dashboard route data");
    return data as DashboardData;
  });
};

/** The Pension page's saved facts, with the drawer opened by its deep link. */
const pensionFacts = async (page: Page) => {
  await page.goto("/app/pension#pension-details");
  const details = page.locator("#pension-details");
  const fact = (term: string) =>
    details
      .locator("dl > div")
      .filter({ has: page.locator("dt", { hasText: term }) })
      .locator("dd");
  await expect(fact("You pay")).toBeVisible();
  return { details, fact };
};

// L27 (slice 6): the rates saved on the profile are the rates on Pension and on the Dashboard,
// and the old row defaults (5% and 3%) are never shown as a choice nobody made.
test.describe("L27 pension rates agree on Pension and the Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
    await applyPersona(page, "renter");
    // applyPersona cannot read the profile through the proxy, so start from the persona's rates.
    await api(page, "/user-profile", "PATCH", SAVED);
  });

  test.afterEach(async ({ page }) => {
    await api(page, "/user-profile", "PATCH", SAVED);
  });

  test("the renter's saved 5% and 4% are the rates on both pages", async ({ page }) => {
    const { details, fact } = await pensionFacts(page);
    // 5% of 32,000 = 1,600 a year, 133.33 a month; 4% = 1,280 a year, 106.67 a month.
    await expect(fact("You pay")).toContainText("5% of salary");
    await expect(fact("Employer pays")).toContainText("4% of salary");
    await expect(fact("Method")).toHaveText("No salary sacrifice");
    await expect(details.getByText("Not set")).toHaveCount(0);

    const dashboard = await dashboardData(page);
    expect(dashboard.pensionData.employeePercent).toBe(5);
    expect(dashboard.pensionData.employerPercent).toBe(4);
    expect(dashboard.pensionData.isSalarySacrifice).toBe(false);
    await expect(page.getByTestId("widget-card-pension")).not.toContainText("Not set");
  });

  test("a chosen 5% and 3% with salary sacrifice shows as chosen on both pages", async ({
    page,
  }) => {
    await api(page, "/user-profile", "PATCH", {
      pensionPercent: 5,
      pensionEmployerPercent: 3,
      isSalarySacrifice: true,
    });

    const { details, fact } = await pensionFacts(page);
    await expect(fact("You pay")).toContainText("5% of salary");
    await expect(fact("Employer pays")).toContainText("3% of salary");
    await expect(fact("Method")).toContainText("Salary sacrifice");
    await expect(details.getByText("Not set")).toHaveCount(0);

    const dashboard = await dashboardData(page);
    expect(dashboard.pensionData.employeePercent).toBe(5);
    expect(dashboard.pensionData.employerPercent).toBe(3);
    expect(dashboard.pensionData.isSalarySacrifice).toBe(true);
    // Every take-home input is answered, so the Dashboard has a take-home figure.
    expect(dashboard.forecastData.estimatedTakeHome).not.toBeNull();
    await expect(page.getByTestId("widget-card-pension")).not.toContainText("Not set");
  });

  test("rates never answered read Not set on both pages, with no stand-in", async ({ page }) => {
    await api(page, "/user-profile", "PATCH", {
      pensionPercent: null,
      pensionEmployerPercent: null,
      isSalarySacrifice: null,
    });

    const { details, fact } = await pensionFacts(page);
    await expect(fact("You pay")).toHaveText("Not set");
    await expect(fact("Employer pays")).toHaveText("Not set");
    await expect(fact("Method")).toHaveText("Not set");
    await expect(details).not.toContainText("5% of salary");
    await expect(details).not.toContainText("3% of salary");

    const dashboard = await dashboardData(page);
    expect(dashboard.pensionData.employeePercent).toBeNull();
    expect(dashboard.pensionData.employerPercent).toBeNull();
    expect(dashboard.pensionData.isSalarySacrifice).toBeNull();
    // No take-home without the pension answers; the Dashboard names what is missing instead.
    expect(dashboard.forecastData.estimatedTakeHome).toBeNull();
    expect(dashboard.forecastData.takeHomeMissing).toContain("pension percentage");
    // The old 5% + 3% stand-in summed to 8%: it is shown nowhere on the pension card.
    await expect(page.getByTestId("widget-card-pension")).not.toContainText("8%");
  });
});
