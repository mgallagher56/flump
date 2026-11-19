import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { applyPersona } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

const api = (page: Page, path: string, method = "GET", body?: unknown) =>
  page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", "x-flump-request": "1" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`${method} ${path} ${response.status}`);
      return (await response.json()) as unknown;
    },
    { path, method, body },
  );

// L71 (HM-3, partial until slice 4 stores the property kind): the homeowner's loan to value is
// 186,000 / 310,000 = 60%. A second property named "Rental flat" used to be added to the home
// value (186,000 / 510,000 = 36.5%). Now the home is ambiguous, so the figure is left out with a
// plain reason.
test("L71 a second property does not change loan to value", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  await page.goto("/app/mortgage");
  await expect(page.locator("#mortgage-saved")).toContainText("60%");

  const rental = (await api(page, "/accounts", "POST", {
    name: "Rental flat",
    type: "Property",
    balance: 200000,
  })) as { id: string };
  try {
    await page.goto("/app/mortgage");
    const saved = page.locator("#mortgage-saved");
    await expect(
      saved.getByText(
        "You have more than one property on Accounts, so we cannot tell which is your home.",
      ),
    ).toBeVisible();
    await expect(saved).not.toContainText("36.5%");
  } finally {
    await backendCall(`/accounts/${rental.id}`, "DELETE");
  }
});
