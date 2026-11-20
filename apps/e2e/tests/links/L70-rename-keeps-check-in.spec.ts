import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { linkSpecHeaders } from "../../support/client-address";
import { waitForHydration } from "../../support/page";
import { applyPersona } from "../../support/personas";
import { api } from "./budget-links.helpers";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

type Account = { id: string; name: string };

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

// L70 (CH-3, system audit slice 4): the reminder reads finished check-ins, so a balance edit (which
// records this month for that account) and a new account (which records its first month) leave
// it in place. Before slice 4 either one hid the reminder for the rest of the month.
test("L70 a balance edit or a new account does not finish the check-in", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");
  await page.goto("/app");
  await waitForHydration(page);
  if (!(await startRow(page).isVisible())) {
    await api(page, "/user-profile/reset-financial-data", "POST", { confirmation: "RESET" });
    await applyPersona(page, "homeowner");
  }
  const accounts = (await api(page, "/accounts")) as Array<Account & { balance: number }>;
  const current = accounts.find((a) => a.name === "Current account");
  if (!current) throw new Error("homeowner persona has no Current account");

  const created = (await api(page, "/accounts", "POST", {
    name: "L70 new saver",
    type: "Saving",
    balance: 10,
  })) as Account;
  try {
    await api(page, `/accounts/${current.id}`, "PATCH", { balance: current.balance + 1 });
    await page.goto("/app");
    await expect(startRow(page)).toBeVisible();
  } finally {
    await api(page, `/accounts/${current.id}`, "PATCH", { balance: current.balance });
    await backendCall(`/accounts/${created.id}`, "DELETE");
  }
});
