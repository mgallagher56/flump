/**
 * monthly-check-in: from the dashboard's Monthly check-in card, open the check-in, record a changed
 * Current account balance (£3,400 seeded, £3,600 recorded), close it, see Net worth history show the
 * month, then confirm the balance after a reload and through /api/accounts, and that the dashboard
 * card offers to continue the part-done check-in (Rule B17).
 *
 * Expects the homeowner persona with this month unrecorded (a fresh `up` or `seed homeowner`).
 * Changes saved data: run `verify-flump seed homeowner <run-id>` afterwards for the baseline.
 * Run: verify-flump drive monthly-check-in <run-id>
 */
import { expect, journey, open } from "../scripts/lib.ts";

const ACCOUNT = "Current account";
const BALANCE = 3600;
const month = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  month: "long",
  year: "numeric",
}).format(new Date());
const pounds = (n: number) => `£${new Intl.NumberFormat("en-GB").format(n)}`;

await journey("monthly-check-in", async ({ page, step, api, save }) => {
  const sheet = page.getByRole("dialog", { name: "Monthly check-in" });
  const startLink = page
    .locator("#monthly-check-in-card")
    .getByRole("link", { name: /^(Start monthly|Continue) check-in$/ });

  await step("open the check-in from the dashboard card", async () => {
    await open(page, "/");
    const card = page.locator("#monthly-check-in-card");
    await expect(card.getByRole("heading", { name: "Monthly check-in" })).toBeVisible();
    await startLink.click();
    await expect(page).toHaveURL(/\/app\/accounts\/history\?checkIn=1$/);
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(month);
  });

  await step("record a new Current account balance", async () => {
    const field = sheet.getByRole("textbox", { name: `New balance in pounds, ${ACCOUNT}` });
    await field.fill(new Intl.NumberFormat("en-GB").format(BALANCE));
    await field.press("Enter");
    await expect(sheet.getByText(`Updated ${pounds(BALANCE)}`)).toBeVisible();
  });

  await step("close the check-in and see Net worth history", async () => {
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Net worth history" })).toBeVisible();
    await expect(
      page.getByText(/^(Net worth recorded for |Up £|Down £|No change since )/).first(),
    ).toBeVisible();
  });

  await step("reload history: this month is recorded", async () => {
    await open(page, "/app/accounts/history");
    await expect(page.getByRole("heading", { level: 1, name: "Net worth history" })).toBeVisible();
    await expect(page.getByTestId("snapshot-history")).toContainText(month);
  });

  await step("read back the balance through /api/accounts", async () => {
    const body = (await api("/accounts")) as unknown;
    const rows = (
      Array.isArray(body)
        ? body
        : ((body as { items?: unknown[]; data?: unknown[] }).items ??
          (body as { data?: unknown[] }).data ??
          [])
    ) as Array<Record<string, unknown>>;
    const saved = rows.find((r) => r.name === ACCOUNT);
    save("api-current-account.json", saved ?? { missing: ACCOUNT, count: rows.length });
    expect(Number(saved?.balance)).toBe(BALANCE);
  });

  await step("the dashboard card offers to continue the part-done check-in", async () => {
    await open(page, "/");
    await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();
    // Only one row is saved, so the check-in is not finished and the card still shows. Rule
    // B17 (docs/ux/UX-GUIDELINES.md): the link reads "Continue check-in" when part done.
    await expect(startLink).toHaveText("Continue check-in");
  });
});
