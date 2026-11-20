import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { linkSpecHeaders } from "../../support/client-address";
import { applyPersona, HOMEOWNER, taxYearStart } from "../../support/personas";

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

// The tests below reuse the homeowner persona the tests above applied: the links project runs
// one file at a time in order (playwright.config.ts), and each test above puts the persona's
// profile back. No new persona seeding or rate-window wait, so this file stays inside the
// backend's request limits (support/rate-window.ts).

type SavedTaxRecord = {
  id: string;
  accountId?: string | null;
  category: string;
  source: string;
  type: string;
};

/**
 * Moves a record this file created to 6 April of the previous tax year, where no estimate for the
 * current year reads it, in place of deleting it: the backend allows 10 destructive calls an hour
 * per user, and the suite shares them (resets and every delete count).
 */
async function moveToPreviousTaxYear(recordId: string, extra: Record<string, unknown> = {}) {
  const start = Number(taxYearStart(new Date()).slice(0, 4));
  await backendCall(`/tax-records/${recordId}`, "PATCH", {
    date: `${start - 1}-04-06`,
    ...extra,
  });
}

// L29 (SA-3, owner decision 7): a tax region of Scotland saved on Profile reaches Self Assessment
// and the Dashboard card, which show the same Scottish estimate. The homeowner earns 58,000.
// 2026/27, worked by hand from the Scottish bands in
// packages/finance-engine/src/tax-calculator.scottish.test.ts (taxable income above the 12,570
// Personal Allowance: starter to 3,967, basic to 16,956, intermediate to 31,092, higher 42% to
// 62,430):
// salary taxable 58,000 - 12,570 = 45,430, already in the higher band.
// Rent 10,000 with no expenses: the 1,000 property allowance beats 0 costs, so profit 9,000.
// 45,430 + 9,000 = 54,430, still under 62,430, so all 9,000 at 42% = 3,780. No NI on rent.
// On England bands it would be 9,000 at 40% = 3,600.
test("L29 a Scottish tax region gives the same Scottish estimate on Self Assessment and the Dashboard", async ({
  page,
}) => {
  await page.goto("/app");
  const before = HOMEOWNER.profile as Profile & { taxRegion?: string | null };
  let recordId: string | null = null;

  try {
    await api(page, "/user-profile", "PATCH", {
      taxRegion: "SCOTLAND",
      enabledPages: withTax(before.enabledPages),
      dashboardWidgets: withTax(before.dashboardWidgets),
    });
    const created = (await backendCall("/tax-records", "POST", {
      type: "income",
      source: "rental",
      category: "rental_income",
      name: "L29 rent",
      amount: 10000,
      frequency: "annual",
      date: new Date().toISOString().slice(0, 10),
    })) as TaxRecordRow;
    recordId = created.id;

    await page.goto("/app/self-assessment");
    const summary = page.getByRole("region", { name: "Summary" }).getByTestId("hero-figure");
    await expect(summary).toContainText(/£[\d,]+/);
    const now = new Date();
    const in2026to27 = now >= new Date("2026-04-06") && now < new Date("2027-04-06");
    if (in2026to27) await expect(summary).toContainText("£3,780");
    await expect(page.getByRole("note")).toContainText("Uses Scottish rates");
    const pageFigure = (await summary.innerText()).match(/£[\d,]+/)?.[0] ?? "";

    await page.goto("/app");
    await expect(page.locator('[data-figure="tax.estimatedDue"]')).toContainText(pageFigure);
  } finally {
    // No delete: the backend allows 10 destructive calls an hour per user, shared by the whole
    // suite. The record moves to the previous tax year, where no current estimate reads it.
    if (recordId) await moveToPreviousTaxYear(recordId);
    await api(page, "/user-profile", "PATCH", {
      taxRegion: before.taxRegion ?? "ENGLAND",
      enabledPages: before.enabledPages ?? null,
      dashboardWidgets: before.dashboardWidgets ?? null,
    });
  }
});

// L21 (SA-4, owner decision 5): a buy-to-let mortgage in Accounts brings its interest into Self
// Assessment as an estimated figure to check, and adding it saves a record linked to the
// mortgage. The test borrows the homeowner's own mortgage and home, marked buy-to-let and rental
// for the test and put back after, so it creates and deletes no account (the backend allows 10
// destructive calls an hour per user, shared by the whole suite). It runs last in this file
// because, while the home is marked rental, the share and the offers on the page change. The
// figure depends on the persona's history months, so the test checks the card and the link, not
// the amount; the amount is worked by hand in apps/web/app/features/tax/linkedAccounts.test.ts.
test("L21 a buy-to-let mortgage's estimated interest is added as a record linked to it", async ({
  page,
}) => {
  await page.goto("/app");
  const before: Profile = HOMEOWNER.profile as Profile;
  type Account = { id: string; name: string; accountSubtype?: string | null };
  const accounts = await backendCall<Account[]>("/accounts");
  const mortgage = accounts.find((a) => a.name === "Residential mortgage");
  const home = accounts.find((a) => a.name === "Home");
  if (!mortgage || !home) throw new Error("The homeowner persona has no mortgage and home");
  let recordId: string | null = null;

  try {
    await api(page, "/user-profile", "PATCH", {
      enabledPages: withTax(before.enabledPages),
      dashboardWidgets: withTax(before.dashboardWidgets),
    });
    await backendCall(`/accounts/${home.id}`, "PATCH", { accountSubtype: "rental" });
    await backendCall(`/accounts/${mortgage.id}`, "PATCH", { accountSubtype: "btl_mortgage" });

    await page.goto("/app/self-assessment");
    const card = page.getByTestId(`calculated-figure-${mortgage.id}`);
    await expect(card).toContainText(
      /Estimated mortgage interest for \d{4}\/\d{2}: £[\d,]+\.\d{2}/,
    );
    await expect(card).toContainText("4.5% rate");
    await card.getByRole("button", { name: /^Add this estimate as a record/ }).click();
    // Once the linked record is saved, the page reloads its data and the offer goes.
    await expect(card).toHaveCount(0);

    const records = await backendCall<SavedTaxRecord[]>("/tax-records");
    const linked = records.find(
      (r) => r.accountId === mortgage.id && r.category === "mortgage_interest",
    );
    expect(linked).toBeDefined();
    expect(linked?.source).toBe("rental");
    expect(linked?.type).toBe("expense");
    recordId = linked?.id ?? null;
  } finally {
    // No delete: the record moves to the previous tax year and loses its link.
    if (recordId) await moveToPreviousTaxYear(recordId, { accountId: null });
    await backendCall(`/accounts/${mortgage.id}`, "PATCH", {
      accountSubtype: mortgage.accountSubtype ?? null,
    });
    await backendCall(`/accounts/${home.id}`, "PATCH", {
      accountSubtype: home.accountSubtype ?? null,
    });
    await api(page, "/user-profile", "PATCH", {
      enabledPages: before.enabledPages ?? null,
      dashboardWidgets: before.dashboardWidgets ?? null,
    });
  }
});
