import { MORTGAGE_ESTIMATE_STANDALONE_NOTICE } from "@flump/finance-engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MortgageEstimatesContainer from "./MortgageEstimatesContainer";

const mockLoaderData = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: () => mockLoaderData(),
  };
});

describe("MortgageEstimatesContainer", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockLoaderData.mockReturnValue({
      accounts: [],
      accountDetails: [],
      budgetEntries: [
        {
          id: "b1",
          name: "Groceries",
          amount: 500,
          frequency: "monthly",
          category: "food",
          isEssential: true,
          isIncome: false,
        },
        {
          id: "b2",
          name: "Rent",
          amount: 900,
          frequency: "monthly",
          category: "housing",
          isEssential: true,
          isIncome: false,
        },
        {
          id: "b3",
          name: "ISA",
          amount: 200,
          frequency: "monthly",
          category: "savings",
          isEssential: false,
          isIncome: false,
        },
      ],
      userProfile: {
        annualSalary: 45000,
        employmentType: "employed",
        taxRegion: "ENGLAND",
        studentLoanPlans: [],
        pensionPercent: 0,
        isSalarySacrifice: false,
        housingStatus: "renting",
        monthlyHousingCost: 900,
      },
    });
  });

  it("renders hero, 3 KPIs, standing notice, and all three tools without the word affordable", () => {
    const { container } = render(
      <MemoryRouter>
        <MortgageEstimatesContainer />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Mortgage estimates" })).not.toBeNull();
    expect(screen.getByTestId("mortgage-estimates-hero").textContent).toContain(
      "Left each month before housing",
    );
    expect(screen.getByText("Take-home pay")).not.toBeNull();
    expect(screen.getByText("Essentials without housing")).not.toBeNull();
    expect(screen.getByText("Debt payments")).not.toBeNull();
    expect(screen.getByText(MORTGAGE_ESTIMATE_STANDALONE_NOTICE)).not.toBeNull();
    expect(container.textContent?.toLowerCase()).not.toContain("affordab");
  });

  it("switches between the three tools and updates hero when planned savings toggle changes", () => {
    render(
      <MemoryRouter>
        <MortgageEstimatesContainer />
      </MemoryRouter>,
    );

    const heroBefore = screen.getByTestId("mortgage-estimates-hero").textContent;
    fireEvent.click(screen.getByRole("switch", { name: "Subtract planned savings" }));
    const heroAfter = screen.getByTestId("mortgage-estimates-hero").textContent;
    expect(heroAfter).not.toEqual(heroBefore);

    fireEvent.click(screen.getByRole("tab", { name: "From income" }));
    expect(screen.getByTestId("income-multiple-result").textContent).toContain(
      "~£180,000 to ~£203,000",
    );

    fireEvent.click(screen.getByRole("tab", { name: "If rates change" }));
    expect(screen.getByTestId("rate-change-result")).not.toBeNull();
  });

  it("uses the saved remaining term in months, not rounded to whole years", () => {
    // 235 months / 12 = 19.583 years, shown as 19.58. Rounding to years would show 20.
    mockLoaderData.mockReturnValue({
      ...mockLoaderData(),
      accounts: [
        {
          id: "m1",
          type: "Mortgage",
          propertyCategory: "residential",
          balance: 180000,
          interestRate: 4.5,
          remainingTermMonths: 235,
          remainingTermYears: 20,
        },
      ],
    });
    render(
      <MemoryRouter>
        <MortgageEstimatesContainer />
      </MemoryRouter>,
    );
    const term = screen.getByRole("textbox", { name: "Term in years input" }) as HTMLInputElement;
    expect(term.value).toBe("19.58");

    fireEvent.click(screen.getByRole("tab", { name: "If rates change" }));
    expect(screen.getByTestId("rate-change-result").textContent).toContain("Over 19.58 years");
  });

  it("assumes 25 years when no mortgage term is saved", () => {
    render(
      <MemoryRouter>
        <MortgageEstimatesContainer />
      </MemoryRouter>,
    );
    const term = screen.getByRole("textbox", { name: "Term in years input" }) as HTMLInputElement;
    expect(term.value).toBe("25");
  });

  it("asks where the property is with no prefill and adds the unverified lead once a stamp duty figure shows", () => {
    // Saved tax region is ENGLAND, but nothing is prefilled: England, Northern Ireland and Wales
    // share one income tax region and have different property taxes (E39 MA7).
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <MemoryRouter>
        <MortgageEstimatesContainer />
      </MemoryRouter>,
    );
    const notice = () =>
      screen.getByRole("note", { name: "Guidance, not advice" }).textContent ?? "";
    expect(notice().startsWith("Unverified estimate.")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Stamp duty estimate" }));
    for (const name of ["England or Northern Ireland", "Scotland", "Wales"]) {
      expect((screen.getByRole("radio", { name }) as HTMLInputElement).checked).toBe(false);
    }

    const price = screen.getByLabelText(/Property price/);
    fireEvent.change(price, { target: { value: "250000" } });
    fireEvent.blur(price);
    fireEvent.click(screen.getByRole("radio", { name: "England or Northern Ireland" }));
    fireEvent.click(screen.getByRole("radio", { name: "No" }));

    // SDLT £250,000, standard rates: 2% x (250,000 - 125,000) = £2,500.
    expect(screen.getByTestId("stamp-duty-result").textContent).toContain(
      "Estimated stamp duty: ~£2,500",
    );
    expect(notice().startsWith("Unverified estimate.")).toBe(true);
    // Scenario only: nothing is sent.
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("takes stamp duty off the deposit with the loan tool's price, and asks for a price only where no tool gives one (E39 S1c)", () => {
    render(
      <MemoryRouter>
        <MortgageEstimatesContainer />
      </MemoryRouter>,
    );
    const setField = (name: string | RegExp, value: string) => {
      const input = screen.getByRole("textbox", { name });
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input);
    };
    setField("Monthly payment input", "750");
    setField("Interest rate input", "0");
    fireEvent.click(screen.getByRole("button", { name: "Deposit and buying costs" }));
    const deposit = screen.getByLabelText(/^Deposit/);
    fireEvent.change(deposit, { target: { value: "27500" } });
    fireEvent.blur(deposit);

    // 0% over 25 years: £750 x 300 = £225,000. Before the tax answers: 225,000 + 27,500 =
    // £252,500 -> ~£253,000, LTV 89.1% -> 89%.
    const loanText = () => screen.getByTestId("loan-from-payment-result").textContent ?? "";
    expect(loanText()).toContain("Property price ~£253,000, loan to value 89%");

    fireEvent.click(screen.getByRole("button", { name: "Stamp duty estimate" }));
    expect(screen.queryByLabelText(/Property price/)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "England or Northern Ireland" }));
    fireEvent.click(screen.getByRole("radio", { name: "No" }));

    // SDLT: the largest price with price + tax <= £252,500 is £250,000 (2% x 125,000 = £2,500).
    expect(screen.getByTestId("stamp-duty-result").textContent).toContain(
      "Estimated stamp duty: ~£2,500",
    );
    expect(loanText()).toContain("Property price ~£250,000, loan to value 90%");
    expect(
      screen
        .getByRole("note", { name: "Guidance, not advice" })
        .textContent?.startsWith("Unverified estimate."),
    ).toBe(true);

    // The rate tool gives no property price, so the section asks for one there. Radix tabs
    // switch on mouse down, not click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "If rates change" }), { button: 0 });
    expect(screen.getByRole("tab", { name: "If rates change" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByLabelText(/Property price/)).not.toBeNull();
    expect(screen.getByTestId("stamp-duty-empty").textContent).toBe(
      "Enter a property price to see an estimate.",
    );
  });
});
