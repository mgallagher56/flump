/**
 * student-loan-plan5: the public student loan calculator (/tools/uk-student-loan-overpay-or-invest-calculator)
 * for a Plan 5 loan at 2026/27 rates, signed out. A £40,000 salary shows a repayment; a £24,000
 * salary, below the £25,000 threshold, shows nothing taken a month. No "Unverified estimate"
 * notice shows, as 2026/27 is a signed year (#906, #912). The page saves nothing, so the second
 * view is a reload: the calculator goes back to its example figures.
 * Run: verify-flump drive student-loan-plan5 <run-id>
 *
 * Limit: the calculator always uses the current tax year (2026/27 on this date) and has no year
 * picker, so the "No Plan 5 repayments were due" line for 2023/24 to 2025/26 (#906) cannot be
 * reached from the app; the unit tests and stories cover it.
 *
 * Hand working, Plan 5 in 2026/27: 9% of pay above £25,000 a year, written off after 40 years.
 *   £40,000: (40,000 - 25,000) x 9% = 1,350 a year; / 12 = 112.50 a month, shown in whole
 *   pounds as £113.
 *   With a £45,000 balance, a year's interest at 6.5% is 2,925; 1,350 is under 1.5 x 2,925, so
 *   the estimate is "Written off after 40 years".
 *   £24,000: under the threshold, so 0 a month.
 */
import type { Locator } from "@playwright/test";
import { expect, journey, open } from "../scripts/lib.ts";

const PATH = "/tools/uk-student-loan-overpay-or-invest-calculator";

/** Types into a slider's value pill the way a user does: focus, select all, type, leave. */
const typeInPill = async (pill: Locator, text: string) => {
  await pill.click();
  await pill.press("ControlOrMeta+a");
  await pill.pressSequentially(text);
  await pill.blur();
};

await journey(
  "student-loan-plan5",
  async ({ page, step, save }) => {
    const tool = () => page.getByTestId("student-loan-tool");
    const outcomes = () => page.getByTestId("student-loan-outcomes");
    const monthly = () =>
      outcomes()
        .locator("[data-kpi-card]")
        .filter({ hasText: "Estimated repayment a month" })
        .locator("[data-kpi-value]");

    await step("open the student loan calculator", async () => {
      await open(page, PATH);
      await expect(tool()).toBeVisible();
    });

    await step("choose Plan 5 with a £40,000 salary and £45,000 balance", async () => {
      await tool().getByRole("combobox", { name: "Student loan plan" }).selectOption("plan5");
      await typeInPill(
        tool().getByRole("textbox", { name: "Yearly salary before tax input" }),
        "40000",
      );
      await typeInPill(
        tool().getByRole("textbox", { name: "Student loan balance input" }),
        "45000",
      );
      await expect(monthly()).toHaveText("£113");
      await expect(outcomes()).toContainText("Written off after 40 years");
      save("repayment-due.txt", (await outcomes().textContent()) ?? "");
    });

    await step("the working says 9% of pay above £25,000", async () => {
      await tool().getByRole("button", { name: "How this is worked out" }).click();
      await expect(tool()).toContainText(
        "Repayments on this plan are 9% of pay above £25,000 a year.",
      );
    });

    await step("no Unverified estimate notice for 2026/27", async () => {
      await expect(page.getByText("Unverified estimate")).toHaveCount(0);
      await expect(page.getByTestId("student-loan-refusal")).toHaveCount(0);
      await expect(tool().getByTestId("projection-notice")).toBeVisible();
    });

    await step("a £24,000 salary is under the threshold: nothing a month", async () => {
      await typeInPill(
        tool().getByRole("textbox", { name: "Yearly salary before tax input" }),
        "24000",
      );
      await expect(monthly()).toHaveText(/^£0(\.00)?$/);
      await expect(page.getByText("Unverified estimate")).toHaveCount(0);
      save("below-threshold.txt", (await outcomes().textContent()) ?? "");
    });

    await step("reload: the calculator is back to its example figures", async () => {
      await page.reload();
      await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
      await expect(tool().getByRole("combobox", { name: "Student loan plan" })).toHaveValue(
        "plan2",
      );
    });
  },
  { signedIn: false },
);
