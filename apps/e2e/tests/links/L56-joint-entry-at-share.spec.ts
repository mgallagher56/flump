import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";
import { api, entryNamed, pounds } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

// L56 (JO-4): a joint budget entry counts at its share in every budget figure, the same on the
// Budget page and the Dashboard.
test("L56 a joint entry at 50% counts at half on Budget and Dashboard", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const row = await entryNamed(page, "Eating out");

  try {
    await page.goto("/app/budget");
    const surplus = page.locator('[data-figure="budget.surplus"]').first();
    const before = pounds(await surplus.textContent());

    await api(page, `/budget-entries/${row.id}`, "PATCH", { ownership: "joint", sharePercent: 50 });

    // Eating out £120 at 50% is £60, so left over rises by 120 - 60 = £60.
    await page.reload();
    const after = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );
    expect(after).toBe(before + 60);

    await page.goto("/app");
    const dashboard = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );
    expect(dashboard).toBe(after);
  } finally {
    await api(page, `/budget-entries/${row.id}`, "PATCH", {
      ownership: "sole",
      sharePercent: null,
    });
  }
});
