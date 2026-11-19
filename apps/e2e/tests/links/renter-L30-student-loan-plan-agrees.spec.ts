import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { linkSpecHeaders } from "../../support/client-address";
import { applyPersona, RENTER } from "../../support/personas";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

type Account = { id: string; name: string; type: string; studentLoanPlan?: string | null };

const api = (page: Page, path: string, method = "GET", body?: unknown) =>
  page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", "x-flump-request": "1" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`${method} ${path} ${response.status}`);
      const text = await response.text();
      return (text ? JSON.parse(text) : null) as unknown;
    },
    { path, method, body },
  );

// The take-home inputs this test relies on, put back from the persona (the proxy allows no GET
// of the profile, so applyPersona cannot tell whether an earlier test changed them).
const TAKE_HOME_INPUTS = {
  annualSalary: RENTER.profile.annualSalary,
  monthlyTakeHome: RENTER.profile.monthlyTakeHome,
  studentLoanPlans: RENTER.profile.studentLoanPlans,
  pensionPercent: RENTER.profile.pensionPercent,
  pensionEmployerPercent: RENTER.profile.pensionEmployerPercent,
  isSalarySacrifice: RENTER.profile.isSalarySacrifice,
};

// L30 (slice 6): the plan on the student loan account and the plan on the profile agree, and the
// take-home estimate uses it. Read only after the baseline PATCH, which writes the persona's own
// values, so the finally block writes the same values back.
//
// Worked by hand, 2026/27 (engine tax-rules.ts: plan2 threshold 29,385, rate 9%):
// student loan (32,000 - 29,385) x 9% = 235.35 a year; 235.35 / 12 = 19.61, shown as £20.
// Pension 5% net pay = 1,600 a year, 133.33 a month, shown as £133. The strip's third card is
// "Pension and student loan": 133 + 20 = £153.
test("L30 the student loan plan agrees on the account and the profile, and take-home uses it", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "renter");

  try {
    await api(page, "/user-profile", "PATCH", TAKE_HOME_INPUTS);

    // The account's plan. The app shows it only inside the account's edit dialog, which this
    // test does not open, so it is read from the saved account the pages load.
    const accounts = (await api(page, "/accounts")) as Account[];
    const loan = accounts.find((a) => a.type === "Student Loan");
    if (!loan) throw new Error("renter persona has no Student Loan account");
    expect(loan.studentLoanPlan).toBe("PLAN_2");

    // The profile's plan: Settings, Profile tab.
    await page.goto("/app/profile?tab=profile");
    const plan = page.getByTestId("student-loan-select");
    await expect(plan).toHaveValue("PLAN_2");
    await expect(plan.locator("option:checked")).toHaveText("Plan 2");

    // Take-home uses the plan: a student loan deduction on the page.
    await page.goto("/app/take-home");
    await expect(page.getByTestId("hero-figure")).toContainText(/£[\d,]+/);
    await expect(page.getByText("Pension and student loan", { exact: true })).toBeVisible();

    const now = new Date();
    const in2026to27 = now >= new Date("2026-04-06") && now < new Date("2027-04-06");
    const breakdown = page.getByTestId("take-home-breakdown");
    await breakdown.getByRole("button", { name: "Show details" }).click();
    const loanRow = breakdown.getByRole("row").filter({ hasText: "Student loan" });
    await expect(loanRow).toBeVisible();
    // The worked figure holds at 2026/27 rates; in a later year the deduction must still show.
    if (in2026to27) await expect(loanRow).toContainText("£20");
  } finally {
    await api(page, "/user-profile", "PATCH", TAKE_HOME_INPUTS);
  }
});
