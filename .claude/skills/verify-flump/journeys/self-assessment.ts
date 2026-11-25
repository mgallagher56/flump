/**
 * self-assessment: add self-employed income on /app/self-assessment and see the tax year summary
 * show an estimated bill, add an expense and see the bill fall by a hand-worked amount, then see
 * both records on the income source's own page and after a reload. /app/tax sends you to the page.
 * Expects the selfemployed persona (Self Assessment on, Wales, no tax records yet).
 * Run: verify-flump seed selfemployed <run-id>, then verify-flump drive self-assessment <run-id>
 * Tax records are not on the /api allow-list, so the saved records are proved by a second page view.
 * The Making Tax Digital notice (E28) shows its general line with no records, then the over line
 * once £40,000 of trading income is recorded, and stays after the expense: it counts gross income.
 */
import { expect, journey, open } from "../scripts/lib.ts";

const SUFFIX = Date.now().toString(36);
const INCOME = `Verify trading ${SUFFIX}`;
const EXPENSE = `Verify costs ${SUFFIX}`;
const pounds = (text: string) =>
  Number(/£([\d,]+)/.exec(text)?.[1]?.replaceAll(",", "") ?? Number.NaN);

// Hand-worked change in the bill, 2026/27 rates (Wales uses the same bands as England):
// trading income 40,000 with no expenses takes the 1,000 trading allowance: profit 39,000.
// With 3,000 of expenses, the expenses beat the allowance: profit 37,000. The 2,000 less profit
// sits in the basic rate band and the main Class 4 band whatever else is counted (at most the
// flat's rent, 875 x 12 = 10,500 less the 1,000 property allowance = 9,500; 39,000 + 9,500 =
// 48,500, under the 50,270 higher rate threshold), so the bill falls by
// 2,000 x 20% Income Tax + 2,000 x 6% Class 4 NI = 400 + 120 = 520.
const BILL_DROP = 520;
// The bill itself, worked by hand at 2026/27 rates (the same working as e2e link L48): the
// self-employed salary in the profile is not PAYE pay and no rent record exists, so profit
// 39,000 alone. Income Tax (39,000 - 12,570) x 20% = 5,286; Class 4 NI 26,430 x 6% = 1,585.80.
// 5,286 + 1,585.80 = 6,871.80, shown as £6,872. Pinned only inside the 2026/27 tax year.
const BILL_2026_27 = 6872;
const now = new Date();
const in2026to27 = now >= new Date("2026-04-06") && now < new Date("2027-04-06");
// MTD (SI 2026/336 reg 27(c), signed fable-decider 2026-11-25): 2026/27 qualifying income over
// £20,000 gives 6 April 2028. £40,000 of trading income is over it before and after the £3,000
// expense, because the test is gross income, not profit. Pinned only inside 2026/27.
const MTD_OVER_2026_27 =
  "The self-employed and property income you recorded for the 2026 to 2027 tax year, before expenses, is over £20,000, the threshold for that date.";

await journey("self-assessment", async ({ page, step, save }) => {
  const summary = page.getByRole("region", { name: "Summary" });
  const bill = summary.getByTestId("hero-figure");
  const dialog = page.getByRole("dialog", { name: "Add a record" });
  const mtdNotice = page.locator("#mtd-notice");
  let before = 0;

  await step("/app/tax opens Self Assessment with no records yet", async () => {
    await open(page, "/app/tax");
    await expect(page).toHaveURL(/\/app\/self-assessment$/);
    await expect(page.getByRole("heading", { level: 1, name: "Self Assessment" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Add income outside PAYE to see an estimated tax bill" }),
    ).toBeVisible();
    // Self-employed, nothing recorded: the general Making Tax Digital line only.
    await expect(mtdNotice).toHaveAttribute("data-kind", "general");
    await expect(mtdNotice).toContainText("Flump does not send anything to HMRC.");
  });

  await step("open Add a record for self-employed income", async () => {
    await page.getByRole("button", { name: "Add income or expense" }).click();
    await page.getByRole("menuitem", { name: "Self-employed income" }).click();
    await expect(dialog).toBeVisible();
  });

  await step("add yearly trading income of £40,000", async () => {
    await dialog.getByRole("textbox", { name: "Name" }).fill(INCOME);
    await dialog.getByRole("textbox", { name: "Amount" }).fill("40000");
    await dialog.getByRole("combobox", { name: "How often" }).selectOption("Yearly");
    await dialog.getByRole("button", { name: "Add record", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  await step("the summary shows an estimated bill", async () => {
    await expect(bill).toContainText(/£[\d,]+/);
    await expect(summary).toContainText("£40,000");
    before = pounds((await bill.textContent()) ?? "");
    expect(before).toBeGreaterThan(0);
    if (in2026to27) expect(before).toBe(BILL_2026_27);
  });

  await step("the Making Tax Digital notice states the figure and the date", async () => {
    await expect(mtdNotice).toHaveAttribute("data-kind", "over");
    await expect(mtdNotice).toContainText("is not compatible software for this");
    if (in2026to27) {
      await expect(mtdNotice).toContainText("From 6 April 2028, HMRC expects");
      await expect(mtdNotice).toContainText(MTD_OVER_2026_27);
    }
    await expect(mtdNotice.getByRole("link", { name: /Sign up on GOV.UK/ })).toHaveAttribute(
      "href",
      "https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax",
    );
  });

  await step("add an expense of £3,000 from the summary", async () => {
    await summary.getByRole("button", { name: "Add an expense" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Name" }).fill(EXPENSE);
    await dialog.getByRole("textbox", { name: "Amount" }).fill("3000");
    await dialog.getByRole("combobox", { name: "How often" }).selectOption("Yearly");
    await dialog.getByRole("button", { name: "Add record", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  await step("the bill falls by the hand-worked £520", async () => {
    await expect(summary).toContainText("£37,000");
    await expect(bill).not.toContainText(`£${before.toLocaleString("en-GB")}`);
    const after = pounds((await bill.textContent()) ?? "");
    save("bill.json", { before, after, drop: before - after });
    expect(before - after).toBe(BILL_DROP);
    // Gross, not profit: the expense does not change the Making Tax Digital line.
    await expect(mtdNotice).toHaveAttribute("data-kind", "over");
  });

  await step("the self-employed page lists both records", async () => {
    await open(page, "/app/self-assessment/self-employed");
    const main = page.getByRole("main");
    await expect(main.getByText(INCOME)).toBeVisible();
    await expect(main.getByText(EXPENSE)).toBeVisible();
  });

  await step("reload Self Assessment: the bill is unchanged", async () => {
    await open(page, "/app/self-assessment");
    const after = before - BILL_DROP;
    await expect(bill).toContainText(`£${after.toLocaleString("en-GB")}`);
    await expect(summary).toContainText("£37,000");
  });
});
