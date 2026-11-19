import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { linkSpecHeaders } from "../../support/client-address";
import { applyPersona } from "../../support/personas";
import { accountNamed, api, entryNamed, leftOver } from "./budget-links.helpers";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

// L13 (HM-1, BU-5, audit slice 5): the payment saved on the mortgage account is the budget's
// housing line and so the commitments, on Budget and the Dashboard. Named L33b so it runs among
// the homeowner specs: no extra persona switch.
test("L13 a mortgage payment saved on the account reaches the linked housing line", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const mortgage = await accountNamed(page, "Residential mortgage");
  const row = await entryNamed(page, "Mortgage payment");
  const saved = { monthlyContribution: mortgage.monthlyContribution ?? null };

  try {
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: "housing", amount: 0 });
    await page.goto("/app/budget");
    await expect(page.getByTestId("budget-category-housing")).toContainText("£1,250");
    const before = await leftOver(page);

    // The payment changes on the mortgage account only: £1,250 to £1,400.
    await api(page, `/accounts/${mortgage.id}`, "PATCH", { monthlyContribution: 1400 });

    await page.reload();
    await expect(page.getByTestId("budget-category-housing")).toContainText("£1,400");
    // Left over falls by 1,400 - 1,250 = £150 (homeowner: £135 to £15 short).
    const after = await leftOver(page);
    expect(after).toBe(before - 150);

    // The Dashboard shows the same left over. A shortfall shows there with a minus sign or as
    // short, so the amounts are compared.
    await page.goto("/app");
    expect(Math.abs(await leftOver(page))).toBe(Math.abs(after));
  } finally {
    await api(page, `/accounts/${mortgage.id}`, "PATCH", saved);
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: null, amount: row.amount });
  }
});
