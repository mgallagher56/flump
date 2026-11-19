import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { linkSpecHeaders } from "../../support/client-address";
import { applyPersona } from "../../support/personas";
import { api, entryNamed, leftOver } from "./budget-links.helpers";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

// L57 (JO-8, audit slice 5): a shared rent counts at its share. The saved rent is the whole rent;
// the linked rent line says it is joint and the person's share, and every budget figure counts
// that share (Retirement too: engine test in retirement-input.test.ts; this persona has no saved
// plan to show it). Named L14b so it runs among the renter specs: no extra persona switch.
test("L57 a joint rent at 50% counts at half on Budget and the Dashboard", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "renter");

  const row = await entryNamed(page, "Rent");

  try {
    await api(page, `/budget-entries/${row.id}`, "PATCH", {
      linkKind: "housing",
      amount: 0,
      ownership: "joint",
      sharePercent: 50,
    });

    // Budget: the renter's saved £950 at 50% is £475.
    await page.goto("/app/budget");
    await expect(page.getByTestId("budget-category-housing")).toContainText("£475");
    // Left over: the renter's £125 with £950 rent becomes £125 + 475 = £600 at half the rent.
    const budgetLeftOver = await leftOver(page);
    expect(budgetLeftOver).toBe(600);
    await page.goto("/app");
    expect(await leftOver(page)).toBe(600);
  } finally {
    await api(page, `/budget-entries/${row.id}`, "PATCH", {
      linkKind: null,
      amount: row.amount,
      ownership: "sole",
      sharePercent: null,
    });
  }
});
