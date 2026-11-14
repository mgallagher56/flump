import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";

test.use({ storageState: AUTH_STATE });

/** The current Europe/London month as the app names it, for example "November 2026". */
const londonMonthLabel = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    month: "long",
    year: "numeric",
  }).format(new Date());

test("monthly check-in saves this month's balances and the history page shows them (E30)", async ({
  page,
}) => {
  const month = londonMonthLabel();

  // The dashboard card opens the check-in on the history page.
  await page.goto("/");
  const card = page.locator("#monthly-check-in-card");
  await expect(card.getByRole("heading", { name: "Monthly check-in" })).toBeVisible();
  await card.getByRole("link", { name: /^(Record|Update) balances$/ }).click();
  await expect(page).toHaveURL(/\/app\/accounts\/history\?checkIn=1$/);

  const sheet = page.getByRole("dialog", { name: `Monthly check-in: ${month}` });
  await expect(sheet).toBeVisible();
  // Seeded accounts are prefilled (with last month's value, or today's balance when new).
  const current = sheet.getByRole("textbox", { name: "E2E Current: balance" });
  await expect(current).not.toHaveValue("");
  await current.fill("5,100");
  await sheet.getByRole("button", { name: "Save balances" }).click();

  // Saved through PUT /api/snapshots/:month, confirmed with a toast, then reloaded from the server.
  // Exact match: the toast also renders a screen-reader status line ("Success: Balances saved ...").
  await expect(page.getByText(`Balances saved for ${month}`, { exact: true })).toBeVisible();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Net worth history" })).toBeVisible();
  await expect(page.getByTestId("hero-figure")).toBeVisible();
  await expect(page.getByText(/^Net worth (recorded for|each month since) /).first()).toBeVisible();

  // The Accounts nav item stays active on its sub-page.
  await expect(page.getByRole("link", { name: "Accounts", exact: true }).first()).toHaveAttribute(
    "aria-current",
    "page",
  );
});
