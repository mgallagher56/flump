import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { linkSpecHeaders } from "../../support/client-address";
import { applyPersona, HOMEOWNER } from "../../support/personas";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

type Profile = {
  employmentType?: string | null;
  enabledPages?: string[] | null;
  dashboardWidgets?: string[] | null;
};
type TaxRecordRow = { id: string };

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

const withTax = (list: string[] | null | undefined) => [
  ...(list ?? []).filter((k) => k !== "tax"),
  "tax",
];

// L48 (SA-1): for a self-employed person the Self Assessment page and the Dashboard card show
// the same estimate. Both leave the profile salary (58,000 for the homeowner) out, since a
// self-employed salary is not PAYE pay. 2026/27 rates, worked by hand:
// trading income 40,000 less the 1,000 trading allowance = 39,000 profit.
// Income Tax (39,000 - 12,570) x 20% = 5,286; Class 4 NI 26,430 x 6% = 1,585.80.
// 5,286 + 1,585.80 = 6,871.80, shown as £6,872. The page showed a higher figure before the fix.
test("L48 a self-employed estimate is the same on Self Assessment and the Dashboard", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  // The browser proxy allows no GET of the profile, so put back the persona's own values.
  const before: Profile = HOMEOWNER.profile as Profile;
  let recordId: string | null = null;

  try {
    await api(page, "/user-profile", "PATCH", {
      employmentType: "self-employed",
      enabledPages: withTax(before.enabledPages),
      dashboardWidgets: withTax(before.dashboardWidgets),
    });
    const created = (await backendCall("/tax-records", "POST", {
      type: "income",
      source: "self-employed",
      category: "self_employed_income",
      name: "L48 trading income",
      amount: 40000,
      frequency: "annual",
      date: new Date().toISOString().slice(0, 10),
    })) as TaxRecordRow;
    recordId = created.id;

    await page.goto("/app/self-assessment");
    const summary = page.getByRole("region", { name: "Summary" }).getByTestId("hero-figure");
    await expect(summary).toContainText(/£[\d,]+/);
    // The worked figure holds at 2026/27 rates; in a later tax year the link still requires the
    // two surfaces to agree.
    const now = new Date();
    const in2026to27 = now >= new Date("2026-04-06") && now < new Date("2027-04-06");
    if (in2026to27) await expect(summary).toContainText("£6,872");
    const pageFigure = (await summary.innerText()).match(/£[\d,]+/)?.[0] ?? "";

    await page.goto("/app");
    await expect(page.locator('[data-figure="tax.estimatedDue"]')).toContainText(pageFigure);
  } finally {
    if (recordId) await backendCall(`/tax-records/${recordId}`, "DELETE");
    await api(page, "/user-profile", "PATCH", {
      employmentType: before.employmentType ?? "employed",
      enabledPages: before.enabledPages ?? null,
      dashboardWidgets: before.dashboardWidgets ?? null,
    });
  }
});

// L48, second case (PR 785 review): a self-employed person who keeps the 58,000 salary but has no
// self-employed income record, only 10,000 rent. The trading income decides the band the rent
// falls in, so neither surface works an estimate from £0 PAYE pay: both show it as not set, with
// one prompt to add self-employed income. Before, the page showed a known £0.
test("L48 a self-employed estimate with no self-employed record is not set on both surfaces", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const before: Profile = HOMEOWNER.profile as Profile;
  const prompt = "Add your self-employed income for this tax year to see an estimated tax bill.";
  let recordId: string | null = null;

  try {
    await api(page, "/user-profile", "PATCH", {
      employmentType: "self-employed",
      enabledPages: withTax(before.enabledPages),
      dashboardWidgets: withTax(before.dashboardWidgets),
    });
    const created = (await backendCall("/tax-records", "POST", {
      type: "income",
      source: "rental",
      category: "rental_income",
      name: "L48 rent",
      amount: 10000,
      frequency: "annual",
      date: new Date().toISOString().slice(0, 10),
    })) as TaxRecordRow;
    recordId = created.id;

    await page.goto("/app/self-assessment");
    const hero = page.getByRole("region", { name: "Summary" }).getByTestId("hero-figure");
    await expect(hero).toContainText("Not set");
    await expect(hero).toContainText(prompt);
    await expect(hero).not.toContainText("£");

    await page.goto("/app");
    const card = page.getByTestId("widget-card-tax");
    await expect(card).toContainText("Not set");
    await expect(card).toContainText(prompt);
    await expect(page.locator('[data-figure="tax.estimatedDue"]')).toHaveCount(0);
  } finally {
    if (recordId) await backendCall(`/tax-records/${recordId}`, "DELETE");
    await api(page, "/user-profile", "PATCH", {
      employmentType: before.employmentType ?? "employed",
      enabledPages: before.enabledPages ?? null,
      dashboardWidgets: before.dashboardWidgets ?? null,
    });
  }
});
