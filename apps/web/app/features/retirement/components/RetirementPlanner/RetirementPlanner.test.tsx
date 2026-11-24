import { RetirementPlanResponse } from "@flump/api-contract";
import type { BuildRetirementPlanInputArgs, RetirementSavedPlanInput } from "@flump/finance-engine";
import { MONEYHELPER_PENSIONS_URL } from "@repo/ui";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { MAX_CONTRIBUTION_PERCENT } from "~/features/pension/contribution";
import { retirementPlanUnsavedFixture } from "~/test/fixtures/contractResponses";
import { retirementArgsFromLoader } from "../../retirementInput";
import { RetirementPlanner, type RetirementPlannerProps } from "./RetirementPlanner";

// Router links as plain anchors, so their targets can be checked.
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

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

const ZONE_SHOW = "Show what-if: change your plan";

/** Renders the planner with its scenario zone opened (it starts closed below the saved figures). */
const renderPlanner = (props: Partial<RetirementPlannerProps> = {}, { openZone = true } = {}) => {
  const result = render(
    <MemoryRouter>
      <RetirementPlanner planArgs={planArgs} accountDetails={[]} {...props} />
    </MemoryRouter>,
  );
  const toggle = screen.queryByRole("button", { name: ZONE_SHOW });
  if (openZone && toggle) fireEvent.click(toggle);
  return result;
};

const hero = () => screen.getByTestId("hero-figure");

describe("RetirementPlanner", () => {
  it("starts with the scenario zone closed, summarising the saved plan, and opens it", () => {
    renderPlanner({}, { openZone: false });
    const toggle = screen.getByRole("button", { name: ZONE_SHOW });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.getByText("Starts from your saved plan: retiring at 60, planning to age 80."),
    ).toBeTruthy();
    expect(screen.queryByRole("slider", { name: "Retirement age" })).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByRole("slider", { name: "Retirement age" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide what-if" })).toBeTruthy();
  });

  it("shows no housing cost as an exact £0, not an estimate, and the tracked month in words", () => {
    renderPlanner({
      accountDetails: [{ accountId: "pen", year: 2026, month: 10, value: 100_000 }],
    });
    const housingCard = screen.getByText("Housing in retirement").closest("div")?.parentElement;
    expect(housingCard?.textContent).toMatch(/£0/);
    expect(housingCard?.textContent).not.toMatch(/~£0/);
    expect(screen.getByText(/October 2026: £100,000/)).toBeTruthy();
    expect(screen.queryByText(/2026-10/)).toBeNull();
  });

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
    // After income tax (2026/27, no region saved): 25% of the 5,000 withdrawal is tax-free, so
    // 3,750 + 11,000 = 14,750 is taxed; (14,750 - 12,570) x 20% = 436; 16,000 - 436 = 15,564,
    // rounded to ~£15,600.
    expect(screen.getByText("From State Pension age (67)")).toBeTruthy();
    expect(screen.getByText("~£15,600 a year")).toBeTruthy();
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

  it("shows plain helper text under Plan to age", () => {
    renderPlanner();
    const helpers = screen.getAllByText("The age you want your retirement money to last until.");
    expect(helpers.length).toBeGreaterThanOrEqual(2);
    const input = screen.getByRole("textbox", { name: "Plan to age" });
    expect(input.getAttribute("aria-describedby")).toBe("plan-to-age-helper");
  });

  it("shows saveError in an alert and saveSuccess in a status line", () => {
    const { rerender } = renderPlanner({
      saveError: "We could not save that. Check the details and try again.",
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "We could not save that. Check the details and try again.",
    );
    expect(screen.queryByText("Retirement plan saved.")).toBeNull();

    rerender(
      <MemoryRouter>
        <RetirementPlanner
          planArgs={planArgs}
          accountDetails={[]}
          saveError={null}
          saveSuccess="Retirement plan saved."
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Retirement plan saved.").getAttribute("role")).toBe("status");
  });

  it("clears saveSuccess when a saved-plan input is edited", async () => {
    const user = userEvent.setup();
    renderPlanner({ saveSuccess: "Retirement plan saved." });
    expect(screen.getByText("Retirement plan saved.").getAttribute("role")).toBe("status");

    const planTo = screen.getByRole("textbox", { name: "Plan to age" });
    await user.clear(planTo);
    await user.type(planTo, "92");
    expect(screen.queryByText("Retirement plan saved.")).toBeNull();
  });

  it("changing the scenario growth case never saves", async () => {
    const user = userEvent.setup();
    const onSavePlan = vi.fn();
    renderPlanner({ onSavePlan });
    await user.click(screen.getByRole("button", { name: "Higher case (2%)" }));
    expect(onSavePlan).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reset to saved figures" })).toBeTruthy();
  });

  it("shows the MoneyHelper line at page level, also when there is no estimate yet", () => {
    renderPlanner({ planArgs: { ...planArgs, birthYear: null } });
    const link = screen.getByRole("link", { name: /Pension guidance from MoneyHelper/ });
    expect(link.getAttribute("href")).toBe(MONEYHELPER_PENSIONS_URL);
  });

  describe("with a saved workplace pension", () => {
    // Age 40 in 2026, so there are 20 years to retirement at 60.
    const workplaceArgs: BuildRetirementPlanInputArgs = {
      ...planArgs,
      birthYear: 1986,
      workplacePension: {
        annualSalary: 40_000,
        employeePercent: 6,
        employerPercent: 4,
        isSalarySacrifice: true,
        passEmployerNi: true,
      },
    };

    it("offers your contribution as a percentage of pay, seeded from the saved percent, instead of an extra amount", () => {
      renderPlanner({ planArgs: workplaceArgs });
      const slider = screen.getByLabelText("Your contribution") as HTMLInputElement;
      expect(slider.value).toBe("6");
      expect(screen.getByDisplayValue("6%")).toBeTruthy();
      const qualifying = screen.getByLabelText(
        "Base contributions on pay that counts for your pension",
      );
      // The band sits behind the "i" beside the checkbox, read with it (owner item 23).
      expect(screen.getByRole("button", { name: "About Pay that counts" })).toBeTruthy();
      expect(qualifying.getAttribute("aria-describedby")).toBe("retirement-qualifying-info");
      expect(document.getElementById("retirement-qualifying-info")?.textContent).toMatch(
        /£6,240 and £50,270 a year/,
      );
      expect(screen.queryByLabelText("Extra monthly contribution")).toBeNull();
      expect(slider.max).toBe(String(MAX_CONTRIBUTION_PERCENT));
      expect(MAX_CONTRIBUTION_PERCENT).toBe(40);
    });

    it("says an edited contribution is not saved", () => {
      renderPlanner({ planArgs: workplaceArgs });
      // Saved 6% of £40,000: 2,400 a year ÷ 12 = £200 a month.
      expect(screen.getByText("About £200 a month.")).toBeTruthy();
      fireEvent.change(screen.getByLabelText("Your contribution"), { target: { value: "8" } });
      // 8% of £40,000: 3,200 a year ÷ 12 = £266.67, about £267 a month.
      expect(screen.getByText("About £267 a month. Edited. Not saved.")).toBeTruthy();
    });

    it("works out the pounds on pay that counts once that basis is ticked", () => {
      renderPlanner({ planArgs: workplaceArgs });
      fireEvent.click(
        screen.getByLabelText("Base contributions on pay that counts for your pension"),
      );
      // 6% of £40,000 − £6,240 = 33,760: 2,025.60 a year ÷ 12 = £168.80, about £169 a month.
      expect(screen.getByText("About £169 a month.")).toBeTruthy();
    });

    it("shows a lower estimate with a minus sign, not a hyphen", () => {
      renderPlanner({ planArgs: workplaceArgs });
      fireEvent.change(screen.getByLabelText("Your contribution"), { target: { value: "0" } });
      const text = screen.getByTestId("retirement-scenario-outcome").textContent ?? "";
      expect(text).toMatch(/Change from your saved plan: \u2212~£[\d,]+ a year\./);
      expect(text).not.toContain("-~");
    });

    it("moving your contribution shows the change from the saved plan and never saves", () => {
      const onSavePlan = vi.fn();
      renderPlanner({ planArgs: workplaceArgs, onSavePlan });
      const outcome = () => screen.getByTestId("retirement-scenario-outcome");
      expect(outcome().textContent).not.toMatch(/Change from your saved plan/);
      // Another growth case alone is not a change from the saved plan: it compares like with like.
      fireEvent.click(screen.getByRole("button", { name: /Higher case/ }));
      expect(outcome().textContent).not.toMatch(/Change from your saved plan/);
      const heroBefore = hero().textContent;
      fireEvent.change(screen.getByLabelText("Your contribution"), { target: { value: "10" } });
      expect(outcome().textContent).toMatch(/Change from your saved plan: \+~£[\d,]+ a year\./);
      fireEvent.click(
        screen.getByLabelText("Base contributions on pay that counts for your pension"),
      );
      expect(outcome().textContent).toMatch(/Change from your saved plan: [+-]~£[\d,]+ a year\./);
      expect(hero().textContent).toBe(heroBefore);
      expect(onSavePlan).not.toHaveBeenCalled();
    });

    it("draws the pot each year in the scenario, with no tax-free lump sum figure", () => {
      renderPlanner({ planArgs: workplaceArgs });
      expect(screen.getByRole("figure", { name: "Pot each year" })).toBeTruthy();
      // S6: the lump sum figure appears only once the what-if takes one (tested below).
      expect(screen.queryByText(/Tax-free lump sum at age/)).toBeNull();
    });

    it("names the saved workplace pension in the assumptions drawer, with a link to change it", async () => {
      const user = userEvent.setup();
      renderPlanner({ planArgs: workplaceArgs });
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      expect(
        screen.getByText(
          /Workplace pension: 6% from you and 4% from your employer, of your saved salary of £40,000, from your pension details\./,
        ),
      ).toBeTruthy();
      expect(screen.getByText(/adds the National Insurance it saves/)).toBeTruthy();
      expect(screen.queryByText(/auto-enrolment minimums/)).toBeNull();
      expect(
        screen.getByRole("link", { name: "Change them on the Pension page" }).getAttribute("href"),
      ).toBe("/app/pension#pension-details");
    });

    it("says plainly when a rate is not set and leaves its contribution out", async () => {
      const user = userEvent.setup();
      renderPlanner({
        planArgs: {
          ...workplaceArgs,
          workplacePension: {
            annualSalary: 40_000,
            employeePercent: 5,
            employerPercent: 0,
            notSet: ["pensionEmployerPercent"],
          },
        },
      });
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      expect(
        screen.getByText(
          /Workplace pension: your employer's contribution is not set, so it is not included\. 5% from you, of your saved salary of £40,000, is included\./,
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/auto-enrolment minimums/)).toBeNull();
      expect(
        screen
          .getByRole("link", { name: "Add your rates on the Pension page" })
          .getAttribute("href"),
      ).toBe("/app/pension#pension-details");
    });

    it("says the contributions are left out when a rate is saved but no salary is", async () => {
      const user = userEvent.setup();
      // No salary: no workplace pension can be worked out (workplacePension null), and the
      // projection leaves the contribution out. It says so, never a silent £0 (leftovers, item 1).
      renderPlanner({
        planArgs: { ...planArgs, workplacePension: null },
        workplaceSalaryNotSet: true,
      });
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      expect(
        screen.getByText(
          /Workplace pension: your salary is not set, so your contributions are not included\./,
        ),
      ).toBeTruthy();
      expect(
        screen
          .getByRole("link", { name: "Add your salary on the Pension page" })
          .getAttribute("href"),
      ).toBe("/app/pension#pension-details");
    });

    it("shows no salary line when no rate is saved either", async () => {
      const user = userEvent.setup();
      renderPlanner({ planArgs: { ...planArgs, workplacePension: null } });
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      expect(screen.queryByText(/your salary is not set/)).toBeNull();
    });

    it("says both rates are not set, with no stand-in figure", async () => {
      const user = userEvent.setup();
      renderPlanner({
        planArgs: {
          ...workplaceArgs,
          workplacePension: {
            annualSalary: 40_000,
            employeePercent: 0,
            employerPercent: 0,
            notSet: ["pensionPercent", "pensionEmployerPercent"],
          },
        },
      });
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      const note = screen.getByText(
        /Workplace pension: your contribution and your employer's are not set, so they are not included\./,
      );
      expect(note.textContent).not.toMatch(/\d%/);
    });

    it("states a chosen 5% and 3% as chosen", async () => {
      const user = userEvent.setup();
      renderPlanner({
        planArgs: {
          ...workplaceArgs,
          workplacePension: { annualSalary: 40_000, employeePercent: 5, employerPercent: 3 },
        },
      });
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      expect(
        screen.getByText(
          /Workplace pension: 5% from you and 3% from your employer, of your saved salary of £40,000, from your pension details\./,
        ),
      ).toBeTruthy();
    });

    it("shows a neutral annual allowance line when more than the allowance is paid in", () => {
      renderPlanner({
        planArgs: {
          ...workplaceArgs,
          workplacePension: {
            annualSalary: 200_000,
            employeePercent: 25,
            employerPercent: 10,
          },
        },
      });
      expect(screen.queryByText("Above the annual allowance")).toBeNull();
      expect(
        screen.getByText(/In this illustration £70,000 a year is paid into pensions\./),
      ).toBeTruthy();
      expect(screen.getByText(/The standard annual allowance is £60,000\./)).toBeTruthy();
    });

    it("has no allowance line at ordinary contributions", () => {
      renderPlanner({ planArgs: workplaceArgs });
      expect(screen.queryByText(/The standard annual allowance/)).toBeNull();
    });
  });

  it("keeps the extra monthly contribution when no salary is saved, and shows the change once moved", () => {
    renderPlanner({ planArgs: { ...planArgs, birthYear: 1986 } });
    expect(screen.queryByLabelText("Your contribution")).toBeNull();
    fireEvent.change(screen.getByLabelText("Extra monthly contribution"), {
      target: { value: "200" },
    });
    expect(screen.getByTestId("retirement-scenario-outcome").textContent).toMatch(
      /Change from your saved plan: \+~£[\d,]+ a year\./,
    );
  });

  // Audit slice 5: the planner lists the lines the plan counts. A debt line linked to a loan shows
  // the loan's payment at the person's share (£360 joint at 50% = £180), never its stored £0, and
  // a linked line whose account is gone is not listed.
  it("lists a linked debt line at the loan's payment and leaves out one that is Not set", async () => {
    const user = userEvent.setup();
    renderPlanner({
      planArgs: {
        ...planArgs,
        accounts: [
          ...planArgs.accounts,
          {
            id: "car",
            name: "Car loan",
            type: "Loan",
            balance: -6000,
            monthlyContribution: 360,
            ownership: "joint",
            sharePercent: 50,
          },
        ],
        budgetEntries: [
          ...(planArgs.budgetEntries ?? []),
          {
            id: "44444444-4444-4444-8444-444444444444",
            category: "debt",
            name: "Car loan payment",
            amount: 0,
            frequency: "monthly",
            isIncome: false,
            isEssential: true,
            linkKind: "debt",
            linkAccountId: "car",
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            category: "debt",
            name: "Old card",
            amount: 0,
            frequency: "monthly",
            isIncome: false,
            isEssential: true,
            linkKind: "debt",
            linkAccountId: null,
          },
        ],
      },
    });
    await user.click(screen.getByRole("button", { name: "From budget lines" }));
    expect(screen.getByText("Car loan payment")).toBeDefined();
    expect(screen.getByText("£180 / monthly")).toBeDefined();
    expect(screen.queryByText("Old card")).toBeNull();
  });

  // E34 C1, audit JO-4: a joint grocery line of £520 at 50% shows and counts as £260, as on Budget.
  it("lists a joint budget line at the person's share", async () => {
    const user = userEvent.setup();
    const id = "66666666-6666-4666-8666-666666666666";
    renderPlanner({
      planArgs: {
        ...planArgs,
        budgetEntries: [
          ...(planArgs.budgetEntries ?? []),
          {
            id,
            category: "food",
            name: "Groceries together",
            amount: 520,
            frequency: "monthly",
            isIncome: false,
            isEssential: true,
            ownership: "joint",
            sharePercent: 50,
          },
        ],
      },
    });
    await user.click(screen.getByRole("button", { name: "From budget lines" }));
    expect(screen.getByTestId(`retirement-budget-line-amount-${id}`).textContent).toBe(
      "£260 / monthly, your 50% share",
    );
  });

  describe("income tax in retirement (E33 S6)", () => {
    // Pension 400,000 at real 0% from 60 to 80: 20,000 a year. 25% (5,000) is tax-free, so
    // 15,000 is taxed before 67: (15,000 - 12,570) x 20% = 486; 20,000 - 486 = 19,514 (~£19,500).
    const taxedArgs: BuildRetirementPlanInputArgs = {
      ...planArgs,
      accounts: [{ id: "pen", name: "Workplace pension", type: "Pension", balance: 400_000 }],
    };

    it("shows the hero and the subtitle after income tax", () => {
      renderPlanner({ planArgs: taxedArgs });
      expect(within(hero()).getByText("~£19,500")).toBeTruthy();
      expect(screen.getByText("Estimates in today's prices, after income tax.")).toBeTruthy();
      expect(screen.queryByText("Estimates in today's prices, before tax.")).toBeNull();
    });

    it("shows pensions after income tax in the KPI strip", () => {
      renderPlanner({ planArgs: taxedArgs });
      // From 67: 15,000 + 11,000 = 26,000 taxed; (26,000 - 12,570) x 20% = 2,686. The State
      // Pension alone is under the allowance, so pensions carry it all: 20,000 - 2,686 = 17,314.
      expect(screen.getByText("~£17,300")).toBeTruthy();
      expect(
        screen.getByText("A year from age 67 after income tax, middle case (2%)"),
      ).toBeTruthy();
      expect(screen.getByText("A year from age 67, after income tax")).toBeTruthy();
    });

    it("states the estimated income tax and the difference after tax in the outcome", () => {
      renderPlanner({ planArgs: taxedArgs });
      // 19,514 - 20,000 = -486, shown as an estimate.
      expect(
        screen.getByText(
          /Your target: £20,000 a year\. Difference: ~?[−-]~?£486 a year\. Estimated income tax: ~£486 a year\./,
        ),
      ).toBeTruthy();
    });

    it("switches the what-if to a tax-free lump sum at retirement, and never saves", async () => {
      const user = userEvent.setup();
      const onSavePlan = vi.fn();
      renderPlanner({ planArgs: taxedArgs, onSavePlan });
      const each = screen.getByRole("button", { name: "25% of each withdrawal" });
      const lump = screen.getByRole("button", { name: "Lump sum at retirement" });
      expect(each.getAttribute("aria-pressed")).toBe("true");
      expect(lump.getAttribute("aria-pressed")).toBe("false");
      await user.click(lump);
      expect(lump.getAttribute("aria-pressed")).toBe("true");
      expect(each.getAttribute("aria-pressed")).toBe("false");
      // Lump sum 25% x 400,000 = 100,000; 300,000 / 20 = 15,000 a year, all taxed:
      // (15,000 - 12,570) x 20% = 486; 15,000 - 486 = 14,514 (~£14,500).
      expect(screen.getByText(/Tax-free lump sum at age 60: ~£100,000\./)).toBeTruthy();
      const outcome = document.getElementById("retirement-scenario-outcome") as HTMLElement;
      expect(within(outcome).getByText("~£14,500")).toBeTruthy();
      // The saved hero is unchanged.
      expect(within(hero()).getByText("~£19,500")).toBeTruthy();
      expect(onSavePlan).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Reset to saved figures" }));
      expect(screen.queryByText(/Tax-free lump sum at age/)).toBeNull();
    });

    it("shows before tax, income tax and after tax in the year-by-year table", async () => {
      const user = userEvent.setup();
      renderPlanner({ planArgs: taxedArgs });
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      for (const name of ["Before tax", "Income tax", "After tax", "After housing"]) {
        expect(screen.getByRole("columnheader", { name: new RegExp(name) })).toBeTruthy();
      }
      const row60 = screen.getAllByRole("row").find((r) => r.textContent?.startsWith("60"));
      // Age 60: £20,000 before tax, £486 tax, 19,514 after tax and after housing (none).
      expect(row60?.textContent).toBe("60~£20,000~£486~£19,500£0~£19,500");
    });

    it("states the tax year, the assumed region and what is not taxed", async () => {
      const user = userEvent.setup();
      renderPlanner({ planArgs: taxedArgs });
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      expect(
        screen.getByText(
          /uses the 2026 to 2027 tax year's allowances and bands for every year, in today's prices\. No tax region is saved, so England, Wales and Northern Ireland bands are used\./,
        ),
      ).toBeTruthy();
      expect(
        screen.getByText(
          "25% of each pension withdrawal is tax-free until the lump sum allowance of £268,275 is reached. The rest is taxed.",
        ),
      ).toBeTruthy();
      expect(
        screen.getByText(
          "Withdrawals from ISAs, general investment accounts and cash savings are not taxed here. Capital gains tax, dividend tax and tax on savings interest are not included.",
        ),
      ).toBeTruthy();
    });

    it("uses Scottish bands for a saved Scottish tax region", async () => {
      const user = userEvent.setup();
      renderPlanner({ planArgs: { ...taxedArgs, taxRegion: "SCOTLAND" } });
      // 15,000 taxed: 2,430 above the allowance, all at the 19% starter rate = 461.70;
      // 20,000 - 461.70 = 19,538.30 (~£19,500); tax shown as ~£462.
      expect(screen.getByText(/Estimated income tax: ~£462 a year\./)).toBeTruthy();
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      expect(
        screen.getByText(/Scottish income tax bands are used, from your saved tax region\./),
      ).toBeTruthy();
    });

    it("shows the before-tax estimate with the notice when Scottish rates are not published", async () => {
      const user = userEvent.setup();
      // June 2027 is in 2027/28, which has no Scottish rates; born 1967, so 60 then.
      renderPlanner({
        planArgs: {
          ...taxedArgs,
          now: new Date("2027-06-01T12:00:00Z"),
          birthYear: 1967,
          taxRegion: "SCOTLAND",
        },
      });
      // Before tax: 400,000 / 20 = 20,000.
      expect(
        within(hero()).getByText("Estimated yearly income before tax from age 60"),
      ).toBeTruthy();
      expect(within(hero()).getByText("~£20,000")).toBeTruthy();
      expect(screen.getByTestId("retirement-tax-refusal").textContent).toBe(
        "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year. The figures here are before income tax.",
      );
      expect(screen.getByText("Estimates in today's prices, before tax.")).toBeTruthy();
      expect(screen.queryByText(/cannot be worked out/)).toBeNull();
      expect(screen.queryByText(/Estimated income tax:/)).toBeNull();
      expect(screen.getByText("A year before tax, middle case (2%)")).toBeTruthy();
      await user.click(screen.getByRole("button", { name: /Assumptions, pots and year by year/ }));
      expect(screen.queryByRole("columnheader", { name: /Income tax/ })).toBeNull();
      expect(screen.getByRole("columnheader", { name: /Before tax/ })).toBeTruthy();
    });

    it("labels the typed target as spending after tax, with one note", () => {
      renderPlanner({ planArgs: taxedArgs });
      expect(
        screen.getByText("Your yearly target: spending after tax (today's prices)"),
      ).toBeTruthy();
      expect(
        screen.getByRole("textbox", { name: "Yearly target, spending after tax, in pounds" }),
      ).toBeTruthy();
      expect(
        screen.getAllByText(
          "Your target is compared with your estimated income after income tax. If you typed it as a figure before tax, you can change it here.",
        ),
      ).toHaveLength(1);
    });
  });
});
