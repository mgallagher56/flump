import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { waitForHydration } from "../../support/page";
import { applyPersona } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

type Account = { id: string; name: string };

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

const startRow = (page: Page) =>
  page
    .locator("#monthly-check-in-card")
    .getByRole("link", { name: /^(Start monthly|Continue) check-in$/ });

// L70 (CH-3): renaming an account sends no balance, so it records nothing for this month and the
// Dashboard keeps the check-in row. The homeowner persona leaves this month unrecorded.
test("L70 renaming an account keeps the check-in reminder on the Dashboard", async ({ page }) => {
  await page.goto("/app");
  // The check-in spec records this month first, and there is no way to remove a recorded month
  // except a reset. So reset when this month is already recorded, then seed the persona again
  // (it leaves this month unrecorded). One of the ten resets an hour.
  await applyPersona(page, "homeowner");
  await page.goto("/app");
  await waitForHydration(page);
  if (!(await startRow(page).isVisible())) {
    await api(page, "/user-profile/reset-financial-data", "POST", { confirmation: "RESET" });
    await applyPersona(page, "homeowner");
  }

  const accounts = (await api(page, "/accounts")) as Account[];
  const current = accounts.find((a) => a.name === "Current account");
  if (!current) throw new Error("homeowner persona has no Current account");

  await page.goto("/app");
  await expect(startRow(page), "the check-in should be due before the rename").toBeVisible();

  try {
    await page.goto(`/app/accounts/${current.id}`);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Current account L70");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/app");
    await expect(startRow(page)).toBeVisible();
  } finally {
    await api(page, `/accounts/${current.id}`, "PATCH", { name: "Current account" });
  }
});
