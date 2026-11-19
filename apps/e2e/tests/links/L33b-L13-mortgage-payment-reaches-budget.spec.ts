import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";
import { accountNamed, api, entryNamed, pounds } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

// L13 (HM-1, BU-5, audit slice 5): the payment saved on the mortgage account is the budget's
// housing line and so the commitments, on Budget and the Dashboard. Named L33b so it runs among
// the homeowner specs, inside L33's rate window: no extra persona switch or wait.
test("L13 a mortgage payment saved on the account reaches the linked housing line", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const mortgage = await accountNamed(page, "Residential mortgage");
  const row = await entryNamed(page, "Mortgage payment");
  const before = { monthlyContribution: mortgage.monthlyContribution ?? null };

  try {
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: "housing", amount: 0 });
    await page.goto("/app/budget");
    await expect(page.getByTestId("budget-category-housing")).toContainText("£1,250");
    const leftOver = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );

    // The payment changes on the mortgage account only: £1,250 to £1,400.
    await api(page, `/accounts/${mortgage.id}`, "PATCH", { monthlyContribution: 1400 });

    await page.reload();
    await expect(page.getByTestId("budget-category-housing")).toContainText("£1,400");
    // Left over falls by 1,400 - 1,250 = £150.
    const after = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );
    expect(after).toBe(leftOver - 150);

    await page.goto("/app");
    expect(pounds(await page.locator('[data-figure="budget.surplus"]').first().textContent())).toBe(
      after,
    );
  } finally {
    await api(page, `/accounts/${mortgage.id}`, "PATCH", before);
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: null, amount: row.amount });
  }
});
