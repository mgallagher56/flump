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

  // R2-5: the account-by-account check-in. From md (the default desktop viewport) it is one list.
  const sheet = page.getByRole("dialog", { name: "Monthly check-in" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(month);
  // The seeded balance again, so the persona still matches and the next run need not re-seed.
  const current = sheet.getByRole("textbox", { name: /^New balance\s*,\s*Current account$/ });
  await current.fill("3,400");
  // Enter confirms the row and saves it at once (save as you go), then moves to the next row.
  await current.press("Enter");
  await expect(sheet.getByText("Updated £3,400")).toBeVisible();

  // Closing reloads the page's saved data; an interrupted check-in resumes where it stopped.
  await page.keyboard.press("Escape");
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
