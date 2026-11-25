/**
 * take-home-pay: the Take-home pay page works out the homeowner persona's monthly take-home pay
 * from the saved salary (£58,000, England, 8% pension by net pay, no student loan) at 2026/27
 * rates, the strip adds up to the hero, a £10,000 pay rise shows the hand-worked change, and the
 * Mortgage estimates page shows the same take-home pay from the same saved figures.
 * Run: verify-flump drive take-home-pay <run-id>
 *
 * Hand working, England 2026/27 (personal allowance £12,570, basic rate band £37,700, NI primary
 * threshold £12,570, upper earnings limit £50,270, employee NI 8% then 2%):
 *   Pension 58,000 x 8% = 4,640 (net pay: off before Income Tax, not before NI).
 *   Income Tax: 58,000 - 4,640 - 12,570 = 40,790 taxable; 37,700 x 20% = 7,540;
 *     3,090 x 40% = 1,236; total 8,776.
 *   NI: 37,700 x 8% = 3,016; (58,000 - 50,270) x 2% = 154.60; total 3,170.60.
 *   Take-home 58,000 - 4,640 - 8,776 - 3,170.60 = 41,413.40 a year; / 12 = 3,451.12, so £3,451.
 *   Strip: pay before tax 58,000 / 12 = 4,833; Income Tax 8,776 / 12 = 731.33, so 731, and NI
 *     3,170.60 / 12 = 264.22, so 264, each rounded on its own, so tax and NI 995; pension
 *     4,640 / 12 = 386.67, so 387; 4,833 - 995 - 387 = 3,451, the hero (within £2 allowed).
 *   Pay rise of £10,000 (all at 40% tax and 2% NI): pension 800; tax 9,200 x 40% = 3,680;
 *     NI 200; 10,000 - 800 - 3,680 - 200 = 5,320 a year. New take-home 46,733.40 / 12 = 3,894;
 *     3,894 - 3,451 = 443 a month (5,320 / 12 = 443.33 rounds the same), so "+£443".
 */
import type { Locator } from "@playwright/test";
import { expect, journey, open } from "../scripts/lib.ts";

const pounds = (text: string) =>
  Number(/£([\d,]+)/.exec(text)?.[1]?.replaceAll(",", "") ?? Number.NaN);

/** Types into a slider's value pill the way a user does: focus, select all, type, leave. */
const typeInPill = async (pill: Locator, text: string) => {
  await pill.click();
  await pill.press("ControlOrMeta+a");
  await pill.pressSequentially(text);
  await pill.blur();
};

await journey("take-home-pay", async ({ page, step, save }) => {
  const kpi = (label: string) =>
    page.locator("[data-kpi-card]").filter({ hasText: label }).locator("[data-kpi-value]").first();
  const figures = { hero: 0, payBeforeTax: 0, taxAndNi: 0, pension: 0 };

  await step("open Take-home pay: the hero shows £3,451 a month", async () => {
    await open(page, "/app/take-home");
    await expect(page.getByRole("heading", { level: 1, name: "Take-home pay" })).toBeVisible();
    const hero = page.getByRole("group", { name: "Monthly take-home pay" });
    await expect(hero).toContainText("£3,451");
    figures.hero = pounds((await hero.textContent()) ?? "");
  });

  await step("the strip adds up to the hero", async () => {
    figures.payBeforeTax = pounds((await kpi("Monthly pay before tax").textContent()) ?? "");
    figures.taxAndNi = pounds((await kpi("Tax and National Insurance").textContent()) ?? "");
    figures.pension = pounds((await kpi("Pension").textContent()) ?? "");
    save("strip.json", figures);
    expect(figures.payBeforeTax).toBe(4833);
    expect(figures.taxAndNi).toBe(995);
    expect(figures.pension).toBe(387);
    const sum = figures.payBeforeTax - figures.taxAndNi - figures.pension;
    expect(Math.abs(sum - figures.hero)).toBeLessThanOrEqual(2);
  });

  await step("open the pay what-if", async () => {
    await page.getByRole("button", { name: "Show what-if: change your pay" }).click();
    await expect(page.getByRole("tab", { name: "A pay rise" })).toBeVisible();
  });

  await step("a £10,000 pay rise adds £443 a month", async () => {
    await typeInPill(
      page.getByRole("textbox", { name: "Pay rise a year, before tax input" }),
      "10000",
    );
    await expect(page.getByTestId("pay-rise-outcome")).toContainText("+£443");
  });

  await step("Mortgage estimates shows the same take-home pay", async () => {
    await open(page, "/app/mortgage-estimates");
    const value = kpi("Take-home pay");
    await expect(value).toContainText("£3,451");
    save("mortgage-estimates-take-home.txt", (await value.textContent()) ?? "");
  });
});
