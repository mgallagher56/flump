import { RetirementPlanResponse } from "@flump/api-contract";
import type { BuildRetirementPlanInputArgs, RetirementSavedPlanInput } from "@flump/finance-engine";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { retirementPlanUnsavedFixture } from "~/test/fixtures/contractResponses";
import { retirementArgsFromLoader } from "../../retirementInput";
import { RetirementPlanner, type RetirementPlannerProps } from "./RetirementPlanner";

const NOW = new Date("2026-11-17T12:00:00Z");

// Real growth 0% (2% growth, 2% inflation) so every figure can be worked out by hand.
const plan: RetirementSavedPlanInput = {
  retirementAge: 60,
  planToAge: 80,
  target: { kind: "typed", yearlyAmount: 20_000 },
  housingOverride: null,
  statePensionAge: 67,
  statePensionAnnualForecastGbp: 11_000,
  statePensionQualifyingYears: null,
  growthRates: { lower: 0.02, middle: 0.02, higher: 0.02 },
  inflationRate: 0.02,
  cashSavingsNominalRate: 0.02,
  realRentGrowthRate: 0,
  excludedAccountIds: [],
};

const planArgs: BuildRetirementPlanInputArgs = {
  plan,
  birthYear: 1966, // 60 in 2026
  now: NOW,
  housingStatus: "own_outright",
  accounts: [
    { id: "pen", name: "Workplace pension", type: "Pension", balance: 100_000 },
    { id: "isa", name: "Stocks ISA", type: "ISA", balance: 0 },
    { id: "home", name: "Home", type: "Property", balance: 300_000 },
  ],
  budgetEntries: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      category: "essentials",
      name: "Groceries",
      amount: 500,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
    },
  ],
};

const renderPlanner = (props: Partial<RetirementPlannerProps> = {}) =>
  render(
    <MemoryRouter>
      <RetirementPlanner planArgs={planArgs} accountDetails={[]} {...props} />
    </MemoryRouter>,
  );

const hero = () => screen.getByTestId("hero-figure");

describe("RetirementPlanner", () => {
  it("shows the estimated income from the retirement age, rounded, with the target as the one subline figure", () => {
    const { container } = renderPlanner();
    // Pot £100,000 ÷ 20 years = £5,000 a year from 60.
    expect(within(hero()).getByText("Estimated yearly income from age 60")).toBeTruthy();
    expect(within(hero()).getByText("~£5,000")).toBeTruthy();
    expect(within(hero()).getByText("Your target: £20,000 a year.")).toBeTruthy();
    expect(container.textContent).not.toMatch(/\b(should|need|enough|on track|shortfall)\b/i);
  });

  it("shows income from State Pension age as its own row when it differs", () => {
    renderPlanner();
    // 5,000 + 11,000 = £16,000 from 67.
    expect(screen.getByText("From State Pension age (67)")).toBeTruthy();
    expect(screen.getByText("~£16,000 a year")).toBeTruthy();
  });

  it("does not crash when the saved retirement age is below the current age", () => {
    renderPlanner({ planArgs: { ...planArgs, plan: { ...plan, retirementAge: 55 } } });
    // Raised to the current age, 60.
    expect(within(hero()).getByText("Estimated yearly income from age 60")).toBeTruthy();
  });

  it("fails soft with a plain message when the estimate cannot be worked out", () => {
    renderPlanner({ planArgs: { ...planArgs, plan: { ...plan, inflationRate: -1.5 } } });
    expect(
      screen.getByText(
        "The estimate cannot be worked out from your saved details. Check your plan details below.",
      ),
    ).toBeTruthy();
  });

  it("shows no estimate and asks for the year of birth, with the profile prompt", () => {
    renderPlanner({ planArgs: { ...planArgs, birthYear: null } });
    expect(screen.queryByText("~£5,000")).toBeNull();
    expect(screen.getByText("To see an estimate, add your year of birth.")).toBeTruthy();
    // The unit setup renders router links as their text; the link goes to PROFILE_PATH.
    expect(within(hero()).getByText("Add your year of birth")).toBeTruthy();
  });

  it("shows the empty prompt from the GET /retirement-plan response when no plan is saved yet", () => {
    // The exact contract body (id, createdAt and updatedAt null), through the route's own mapper.
    const { plan: unsaved } = RetirementPlanResponse.parse({ plan: retirementPlanUnsavedFixture });
    const args = retirementArgsFromLoader(
      {
        userProfile: { birthYear: 1966, housingStatus: "own_outright" },
        accounts: planArgs.accounts,
        budgetEntries: planArgs.budgetEntries,
        retirementPlan: unsaved,
      } as Parameters<typeof retirementArgsFromLoader>[0],
      NOW,
    );
    renderPlanner({ planArgs: args, etag: null });
    expect(screen.queryByText(/~£/)).toBeNull();
    expect(
      screen.getByText("To see an estimate, add your retirement age and the age to plan to."),
    ).toBeTruthy();
    expect(
      (screen.getByRole("textbox", { name: "Retirement age" }) as HTMLInputElement).value,
    ).toBe("");
    expect((screen.getByRole("textbox", { name: "Plan to age" }) as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("shows no estimate until the retirement age and the age to plan to are saved, with empty fields", () => {
    renderPlanner({
      planArgs: { ...planArgs, plan: { ...plan, retirementAge: null, planToAge: null } },
    });
    expect(
      screen.getByText("To see an estimate, add your retirement age and the age to plan to."),
    ).toBeTruthy();
    expect(
      (screen.getByRole("textbox", { name: "Retirement age" }) as HTMLInputElement).value,
    ).toBe("");
    expect((screen.getByRole("textbox", { name: "Plan to age" }) as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("says the State Pension is not included until its age is entered, and links to the GOV.UK checker", () => {
    renderPlanner({ planArgs: { ...planArgs, plan: { ...plan, statePensionAge: null } } });
    expect(screen.getByText("Not included yet")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Check your State Pension age on GOV.UK" })
        .getAttribute("href"),
    ).toBe("https://www.gov.uk/state-pension-age");
  });

  it("labels the growth cases with the saved rates, not fixed figures", () => {
    renderPlanner({
      planArgs: {
        ...planArgs,
        plan: { ...plan, growthRates: { lower: 0.03, middle: 0.045, higher: 0.07 } },
      },
    });
    expect(screen.getByRole("button", { name: "Lower case (3%)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Middle case (4.5%)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Higher case (7%)" })).toBeTruthy();
    expect(screen.queryByText(/Lower case \(2%\)/)).toBeNull();
  });

  it("saves the counted accounts, growth band and budget target through the save path", async () => {
    const user = userEvent.setup();
    const onSavePlan = vi.fn();
    renderPlanner({ etag: '"2026-11-16T10:00:00.000Z"', onSavePlan });

    await user.click(
      screen.getByRole("button", { name: /Accounts that count towards retirement/ }),
    );
    // Property is never listed; pension and ISA are.
    expect(screen.queryByLabelText("Home")).toBeNull();
    await user.click(screen.getByLabelText("Stocks ISA"));

    const middle = screen.getByLabelText("Middle case growth (% a year)");
    await user.clear(middle);
    await user.type(middle, "4");
    await user.click(screen.getByRole("button", { name: "From budget lines" }));
    await user.click(screen.getByRole("button", { name: "Save plan" }));

    expect(onSavePlan).toHaveBeenCalledTimes(1);
    expect(onSavePlan.mock.calls[0]?.[1]).toBe('"2026-11-16T10:00:00.000Z"');
    expect(onSavePlan.mock.calls[0]?.[0]).toMatchObject({
      retirementAge: 60,
      planToAge: 80,
      excludedAccountIds: ["isa"],
      growthRates: { lower: 0.02, middle: 0.04, higher: 0.02 },
      inflationRate: 0.02,
      target: {
        kind: "budget",
        lineSettings: [
          { budgetEntryId: "33333333-3333-4333-8333-333333333333", status: "continues" },
        ],
      },
    });
  });

  it("does not save when the age to plan to is not after the retirement age", async () => {
    const user = userEvent.setup();
    const onSavePlan = vi.fn();
    renderPlanner({ onSavePlan });
    const planTo = screen.getByRole("textbox", { name: "Plan to age" });
    await user.clear(planTo);
    await user.type(planTo, "50");
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSavePlan).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe(
      "The age to plan to needs to be later than the retirement age.",
    );
  });

  it("changing the scenario growth case never saves", async () => {
    const user = userEvent.setup();
    const onSavePlan = vi.fn();
    renderPlanner({ onSavePlan });
    await user.click(screen.getByRole("button", { name: "Higher case (2%)" }));
    expect(onSavePlan).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reset to saved figures" })).toBeTruthy();
  });
});
