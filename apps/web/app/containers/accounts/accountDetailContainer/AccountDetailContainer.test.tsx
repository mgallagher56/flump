import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AccountDetailContainer, {
  accountCounts,
  balanceDateLine,
  ownerPageFor,
  typeSubtitle,
} from "./AccountDetailContainer";

const mocks = vi.hoisted(() => ({
  mockFetcherSubmit: vi.fn(),
  mockUseLoaderData: vi.fn(() => ({
    account: {
      id: "123456",
      name: "My current account",
      type: "CURRENT",
      balance: 1000,
    },
    accountDetails: [
      {
        month: 1,
        year: 2021,
        value: 1000,
      },
      {
        month: 2,
        year: 2021,
        value: 1000,
      },
      {
        month: 3,
        year: 2021,
        value: 1000,
      },
      {
        month: 4,
        year: 2021,
        value: 1000,
      },
      {
        month: 5,
        year: 2021,
        value: 1000,
      },
      {
        month: 6,
        year: 2021,
        value: 1000,
      },
      {
        month: 7,
        year: 2021,
        value: 1000,
      },
      {
        month: 8,
        year: 2021,
        value: 1000,
      },
      {
        month: 9,
        year: 2021,
        value: 1000,
      },
      {
        month: 10,
        year: 2021,
        value: 1000,
      },
      {
        month: 11,
        year: 2021,
        value: 1000,
      },
      {
        month: 12,
        year: 2021,
        value: 1000,
      },
      {
        month: 1,
        year: 2023,
        value: 1000,
      },
      {
        month: 2,
        year: 2023,
        value: 1000,
      },
      {
        month: 3,
        year: 2023,
        value: 1000,
      },
      {
        month: 4,
        year: 2023,
        value: 1000,
      },
      {
        month: 5,
        year: 2023,
        value: 1000,
      },
      {
        month: 6,
        year: 2023,
        value: 1000,
      },
      {
        month: 7,
        year: 2023,
        value: 1000,
      },
      {
        month: 8,
        year: 2023,
        value: 1000,
      },
      {
        month: 9,
        year: 2023,
        value: 1000,
      },
      {
        month: 10,
        year: 2023,
        value: 1000,
      },
      {
        month: 11,
        year: 2023,
        value: 1000,
      },
      {
        month: 12,
        year: 2023,
        value: 1000,
      },
    ],
  })),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({
      submit: mocks.mockFetcherSubmit,
      state: "idle",
      data: null,
      Form: "form",
    }),
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString()}`,
  }),
}));

describe("<AccountDetailContainer />", () => {
  test("shows the account name, one hero balance and the type label, with Edit in the header", () => {
    const { getByRole, getByText, queryByRole } = customRender(<AccountDetailContainer />);
    expect(getByRole("heading", { level: 1, name: "My current account" })).toBeDefined();
    expect(getByText("Current balance")).toBeDefined();
    expect(queryByRole("heading", { name: "Your account" })).toBeNull();
    expect(getByRole("button", { name: /edit/i })).toBeDefined();
  });

  test("shows the chart with no tabs, and no owner link for a current account", () => {
    const { getByRole, queryByRole, queryByTestId } = customRender(<AccountDetailContainer />);
    expect(queryByRole("tab")).toBeNull();
    expect(getByRole("figure", { name: "My current account balance history" })).toBeDefined();
    expect(queryByTestId("account-owner-link")).toBeNull();
  });

  test("hides the type line when the name already says it", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "m1", name: "Residential mortgage", type: "Mortgage", balance: -180000 },
      accountDetails: [],
    } as never);
    const { queryByText, getByRole, getByTestId } = customRender(<AccountDetailContainer />);
    expect(queryByText("Mortgage", { exact: true })).toBeNull();
    expect(getByRole("link", { name: "See your mortgage" }).getAttribute("href")).toBe(
      "/app/mortgage",
    );
    // The test id resolves (by id), so the current account's null query above proves absence.
    expect(getByTestId("account-owner-link").textContent).toBe("See your mortgage");
  });

  test("says a student loan is not counted under the default choices, and links to debts", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
      accountDetails: [],
    } as never);
    const { getByTestId, getByRole } = customRender(<AccountDetailContainer />);
    expect(getByTestId("hero-figure").textContent).toContain(
      "No monthly balances recorded yet. Not counted in your net worth.",
    );
    expect(getByRole("link", { name: "See your debts" }).getAttribute("href")).toBe("/app/debt");
  });

  test("says nothing about net worth when the account counts", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
      accountDetails: [],
      basis: { countProperty: true, countStudentLoan: true },
    } as never);
    const { queryByText } = customRender(<AccountDetailContainer />);
    expect(queryByText(/Not counted/)).toBeNull();
  });

  test("says nothing about net worth when the choices could not be read", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
      accountDetails: [],
      basis: null,
    } as never);
    const { getByTestId, queryByText } = customRender(<AccountDetailContainer />);
    expect(queryByText(/Not counted/)).toBeNull();
    expect(getByTestId("hero-figure").textContent).toContain("No monthly balances recorded yet");
  });

  test("back to accounts is a real link", () => {
    const { getByRole } = customRender(<AccountDetailContainer />);
    expect(getByRole("link", { name: /back to accounts/i }).getAttribute("href")).toBe(
      "/app/accounts",
    );
  });
  test("history is read-only: no edit, save or add-year controls", () => {
    const { queryByText } = customRender(<AccountDetailContainer />);
    for (const label of ["save", "addPrevYear", "addNextYear", "addCurrentYear"]) {
      expect(queryByText(label)).toBeNull();
    }
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
  });

  test("Edit opens with the saved rate and monthly payment (one field set, SD-8)", async () => {
    const original = mocks.mockUseLoaderData.getMockImplementation();
    mocks.mockUseLoaderData.mockReturnValue({
      account: {
        id: "d1",
        name: "Barclaycard",
        type: "Credit Card",
        balance: -1200,
        interestRate: 24.9,
        monthlyContribution: 40,
      },
      accountDetails: [],
    } as never);
    try {
      const { getByRole, getByLabelText, user } = customRender(<AccountDetailContainer />);
      await user.click(getByRole("button", { name: /edit/i }));
      expect((getByLabelText("Interest rate (APR) (optional)") as HTMLInputElement).value).toBe(
        "24.9",
      );
      expect(
        (getByLabelText("Minimum payment each month (optional)") as HTMLInputElement).value,
      ).toBe("40");
    } finally {
      if (original) mocks.mockUseLoaderData.mockImplementation(original);
    }
  });

  test("shows a negative stored liability balance as a positive amount owed", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "d1", name: "Barclaycard", type: "Credit Card", balance: -1200 },
      accountDetails: [],
    } as never);
    const { queryAllByText } = customRender(<AccountDetailContainer />);
    expect(queryAllByText("£1,200").length).toBeGreaterThan(0);
    expect(queryAllByText("£-1,200").length).toBe(0);
  });

  describe("quick balance update (E38 S2)", () => {
    beforeEach(() => mocks.mockFetcherSubmit.mockClear());

    test("posts the new balance to the route's update action, with no dialog", async () => {
      const { getByRole, queryByRole } = customRender(<AccountDetailContainer />);
      await userEvent.click(getByRole("button", { name: "Update balance" }));
      expect(queryByRole("dialog")).toBeNull();
      const field = getByRole("textbox", { name: "New balance" });
      await userEvent.clear(field);
      await userEvent.type(field, "750{Enter}");
      expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
        { intent: "update", accountId: "123456", balance: "750" },
        { method: "POST" },
      );
    });

    test("sends a debt's amount owed as minus the figure, with the record's version", async () => {
      const original = mocks.mockUseLoaderData.getMockImplementation();
      mocks.mockUseLoaderData.mockImplementation(
        () =>
          ({
            account: {
              id: "d1",
              name: "Barclaycard",
              type: "Credit Card",
              balance: -1200,
              updatedAt: "2026-11-01T10:00:00.000Z",
            },
            accountDetails: [],
          }) as never,
      );
      try {
        const { getByRole } = customRender(<AccountDetailContainer />);
        await userEvent.click(getByRole("button", { name: "Update amount owed" }));
        const field = getByRole("textbox", { name: "Amount owed now" });
        // Opens on the saved amount owed, shown positive: 1200.
        expect((field as HTMLInputElement).value).toBe("1,200");
        await userEvent.clear(field);
        await userEvent.type(field, "900{Enter}");
        // 900 owed is stored as -900.
        expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            intent: "update",
            accountId: "d1",
            balance: "-900",
            version: "2026-11-01T10:00:00.000Z",
          }),
          { method: "POST" },
        );
      } finally {
        if (original) mocks.mockUseLoaderData.mockImplementation(original);
      }
    });
  });

  describe("hero balance", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 10, 14));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test("shows the saved balance and names the month when the figure is not from this month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1500 },
        accountDetails: [{ month: 10, year: 2026, value: 1000 }],
      } as never);
      const { getByTestId, getByText } = customRender(<AccountDetailContainer />);
      expect(getByTestId("hero-figure").textContent).toContain("£1,500");
      expect(getByTestId("hero-figure").textContent).not.toContain("£1,000");
      expect(getByText("As of October")).toBeDefined();
    });

    test("shows the balance alone when it was recorded this month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1100 },
        accountDetails: [
          { month: 9, year: 2026, value: 1000 },
          { month: 11, year: 2026, value: 1100 },
        ],
      } as never);
      const { getByTestId } = customRender(<AccountDetailContainer />);
      const hero = getByTestId("hero-figure").textContent ?? "";
      expect(hero).toBe("Current balance£1,100");
      expect(hero).not.toMatch(/November|September|Up|%/);
    });

    test("says a calculated balance is calculated, naming its month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "m1", name: "Home loan", type: "Mortgage", balance: -186000 },
        accountDetails: [
          { month: 10, year: 2026, value: -186500 },
          { month: 11, year: 2026, value: -186000, source: "calculated" },
        ],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("Calculated for November")).toBeDefined();
    });

    test("adds the year when the last recorded month is in an earlier year", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 900 },
        accountDetails: [{ month: 12, year: 2025, value: 900 }],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("As of December 2025")).toBeDefined();
    });

    test("says no balances are recorded when there are none", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1500 },
        accountDetails: [],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("No monthly balances recorded yet")).toBeDefined();
    });

    test("keeps the not-counted sentence when the balance is otherwise alone", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
        accountDetails: [{ month: 11, year: 2026, value: -25000 }],
      } as never);
      const { getByTestId } = customRender(<AccountDetailContainer />);
      expect(getByTestId("hero-figure").textContent).toContain("Not counted in your net worth.");
      expect(getByTestId("hero-figure").textContent).not.toMatch(/November|As of/);
    });

    test("defect C(e): after a future-dated import the hero figure and date line come from the same month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 2000 },
        accountDetails: [
          { month: 10, year: 2026, value: 1000 },
          { month: 12, year: 2026, value: 2000 },
        ],
      } as never);
      const { getByTestId, getByText } = customRender(<AccountDetailContainer />);
      expect(getByTestId("hero-figure").textContent).toContain("£1,000");
      expect(getByTestId("hero-figure").textContent).not.toContain("£2,000");
      expect(getByText("As of October")).toBeDefined();
    });

    // The fake clock is 14 November 2026, so the current month is November 2026.
    const heroFor = (balance: number, accountDetails: unknown[]) => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance },
        accountDetails,
      } as never);
      return customRender(<AccountDetailContainer />);
    };

    test("dates the figure from the latest month when the months arrive out of order", () => {
      // Latest up to now, by hand: October 2026 (March 2026 and the 2025 months are earlier).
      const { getByText } = heroFor(1500, [
        { month: 3, year: 2026, value: 1 },
        { month: 10, year: 2026, value: 2 },
        { month: 12, year: 2025, value: 3 },
        { month: 9, year: 2026, value: 4 },
        { month: 5, year: 2025, value: 5 },
        { month: 1, year: 2026, value: 6 },
      ]);
      expect(getByText("As of October")).toBeDefined();
    });

    test("a January row next year counts as a future import", () => {
      // January 2027 is after November 2026, so the hero takes October's recorded 1,000, not
      // the saved 2,000 that the import left on the account.
      const { getByTestId, getByText } = heroFor(2000, [
        { month: 10, year: 2026, value: 1000 },
        { month: 1, year: 2027, value: 2000 },
      ]);
      expect(getByTestId("hero-figure").textContent).toContain("£1,000");
      expect(getByText("As of October")).toBeDefined();
    });

    test("a December row last year is not a future import", () => {
      // December 2025 is before November 2026: the hero keeps the saved balance.
      const { getByTestId, getByText } = heroFor(1500, [{ month: 12, year: 2025, value: 900 }]);
      expect(getByTestId("hero-figure").textContent).toContain("£1,500");
      expect(getByText("As of December 2025")).toBeDefined();
    });

    test("a row for this month is not a future import", () => {
      // November 2026 is the current month: the hero keeps the saved balance (D22).
      const { getByTestId } = heroFor(1500, [{ month: 11, year: 2026, value: 1100 }]);
      expect(getByTestId("hero-figure").textContent).toContain("£1,500");
    });

    test("with only a future row the hero keeps the saved balance and says nothing is recorded", () => {
      const { getByTestId, getByText } = heroFor(2000, [{ month: 12, year: 2026, value: 2000 }]);
      expect(getByTestId("hero-figure").textContent).toContain("£2,000");
      expect(getByText("No monthly balances recorded yet")).toBeDefined();
    });

    test("after a future import, a latest month with no value keeps the saved balance", () => {
      // October has no figure, so there is nothing to show from it: the saved 2,000 stays.
      const { getByTestId } = heroFor(2000, [
        { month: 10, year: 2026, value: null },
        { month: 12, year: 2026, value: 2000 },
      ]);
      expect(getByTestId("hero-figure").textContent).toContain("£2,000");
      expect(getByTestId("hero-figure").textContent).not.toContain("£0");
    });

    test("after a future import, a latest month with no value field keeps the saved balance", () => {
      const { getByTestId } = heroFor(2000, [
        { month: 10, year: 2026 },
        { month: 12, year: 2026, value: 2000 },
      ]);
      expect(getByTestId("hero-figure").textContent).toContain("£2,000");
    });

    test("January can be the latest month up to now", () => {
      // January 2026 is after December 2025 and before November 2026.
      const { getByText } = heroFor(1500, [
        { month: 12, year: 2025, value: 1 },
        { month: 1, year: 2026, value: 2 },
      ]);
      expect(getByText("As of January")).toBeDefined();
    });

    test("with no saved balance the hero shows the latest recorded month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: null },
        // The loader returns this account's months only, without an account id on each.
        accountDetails: [{ month: 10, year: 2026, value: 1000 }],
      } as never);
      const { getByTestId } = customRender(<AccountDetailContainer />);
      expect(getByTestId("hero-figure").textContent).toContain("£1,000");
    });

    test("an unknown account with past and future rows still says it cannot be found", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: null,
        accountDetails: [
          { month: 10, year: 2026, value: 1000 },
          { month: 12, year: 2026, value: 2000 },
        ],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("We cannot find that account.")).toBeDefined();
    });

    test("an unknown account with a future row still says it cannot be found", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: null,
        accountDetails: [{ month: 12, year: 2026, value: 2000 }],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("We cannot find that account.")).toBeDefined();
    });

    test("joins the date line and the not-counted sentence with one full stop each", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
        accountDetails: [{ month: 10, year: 2026, value: -25000 }],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("As of October. Not counted in your net worth.")).toBeDefined();
    });
  });

  test("says what happened when the account cannot be found, with a way back", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({ account: null, accountDetails: [] } as never);
    const { getByText, getByRole } = customRender(<AccountDetailContainer />);
    expect(getByText("We cannot find that account.")).toBeDefined();
    expect(getByRole("link", { name: /back to accounts/i })).toBeDefined();
  });
});

describe("<AccountDetailContainer /> with changing loader data", () => {
  let original: ReturnType<typeof mocks.mockUseLoaderData.getMockImplementation>;
  beforeEach(() => {
    original = mocks.mockUseLoaderData.getMockImplementation();
    mocks.mockFetcherSubmit.mockClear();
  });
  afterEach(() => {
    if (original) mocks.mockUseLoaderData.mockImplementation(original);
  });
  const setLoaderData = (data: unknown) =>
    mocks.mockUseLoaderData.mockImplementation(() => data as never);

  test("the hero follows the saved balance after a reload", () => {
    setLoaderData({
      account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1500 },
      accountDetails: [],
    });
    const view = customRender(<AccountDetailContainer />);
    expect(view.getByTestId("hero-figure").textContent).toContain("£1,500");
    setLoaderData({
      account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1750 },
      accountDetails: [],
    });
    view.rerender(<AccountDetailContainer />);
    expect(view.getByTestId("hero-figure").textContent).toContain("£1,750");
  });

  test("loader data with no months says nothing is recorded", () => {
    setLoaderData({ account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1500 } });
    const { getByTestId, getByText } = customRender(<AccountDetailContainer />);
    expect(getByTestId("hero-figure").textContent).toContain("£1,500");
    expect(getByText("No monthly balances recorded yet")).toBeDefined();
  });

  test("a subtype names the type under the account name", () => {
    setLoaderData({
      account: {
        id: "p1",
        name: "Flat",
        type: "Property",
        accountSubtype: "rental",
        balance: 200000,
      },
      accountDetails: [],
    });
    const { getByText, queryByText } = customRender(<AccountDetailContainer />);
    expect(getByText("Rental property")).toBeDefined();
    expect(queryByText("rental", { exact: true })).toBeNull();
  });

  test("with no subtype the type's plain name is used, not the stored type", () => {
    setLoaderData({
      account: { id: "c1", name: "Barclaycard", type: "Credit Card", balance: -100 },
      accountDetails: [],
    });
    const { getByText, queryByText } = customRender(<AccountDetailContainer />);
    expect(getByText("Credit card")).toBeDefined();
    expect(queryByText("Credit Card", { exact: true })).toBeNull();
  });

  test("an unknown type is shown as stored", () => {
    setLoaderData({
      account: { id: "x1", name: "Box", type: "Collectables", balance: 100 },
      accountDetails: [],
    });
    const { getByText } = customRender(<AccountDetailContainer />);
    expect(getByText("Collectables")).toBeDefined();
  });

  test("a joint account's update field says the figure is the whole balance and gives the share", async () => {
    setLoaderData({
      account: {
        id: "a1",
        name: "Joint saver",
        type: "Savings",
        balance: 1000,
        ownership: "joint",
        sharePercent: 40,
      },
      accountDetails: [],
    });
    const { getByRole, getByText } = customRender(<AccountDetailContainer />);
    await userEvent.click(getByRole("button", { name: "Update balance" }));
    expect(getByText(/Your share is 40%/)).toBeDefined();
  });

  test("the update form is named after the account", async () => {
    setLoaderData({
      account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1000 },
      accountDetails: [],
    });
    const { getByRole } = customRender(<AccountDetailContainer />);
    await userEvent.click(getByRole("button", { name: "Update balance" }));
    expect(getByRole("form", { name: /Easy saver$/ })).toBeDefined();
  });

  test("with no saved balance the update field opens empty", async () => {
    for (const account of [
      { id: "a1", name: "Easy saver", type: "Savings", balance: null },
      { id: "a1", name: "Easy saver", type: "Savings" },
    ]) {
      setLoaderData({ account, accountDetails: [] });
      const view = customRender(<AccountDetailContainer />);
      await userEvent.click(view.getByRole("button", { name: "Update balance" }));
      expect((view.getByRole("textbox", { name: "New balance" }) as HTMLInputElement).value).toBe(
        "",
      );
      view.unmount();
    }
  });

  test("a second Enter while the first save is on its way sends nothing more", async () => {
    setLoaderData({
      account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1000 },
      accountDetails: [],
    });
    const { getByRole } = customRender(<AccountDetailContainer />);
    await userEvent.click(getByRole("button", { name: "Update balance" }));
    const field = getByRole("textbox", { name: "New balance" });
    await userEvent.clear(field);
    await userEvent.type(field, "750{Enter}");
    await userEvent.type(field, "{Enter}");
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);
  });

  describe("Edit opens on the saved details", () => {
    const openEdit = async () => {
      const view = customRender(<AccountDetailContainer />);
      await view.user.click(view.getByRole("button", { name: /edit/i }));
      // Labels inside the dialog only: the hero also says "Amount owed".
      return { ...view, getByLabelText: within(view.getByRole("dialog")).getByLabelText };
    };
    const fieldValue = (el: HTMLElement) => (el as HTMLInputElement).value;
    // A date picker keeps its chosen date in a hidden input of the same name.
    const hiddenValue = (name: string) =>
      document.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value;

    test("a joint mortgage: name, kind, amount owed, repayment, term, fixed rate end, property, ownership and share", async () => {
      setLoaderData({
        account: {
          id: "m1",
          name: "Halifax",
          type: "Mortgage",
          accountSubtype: "residential_mortgage",
          balance: -180000,
          repaymentType: "interest-only",
          termMonths: 230,
          fixedRateEndDate: "2027-03-31",
          linkedAccountId: "p1",
          ownership: "joint",
          sharePercent: 40,
        },
        accounts: [
          { id: "p1", name: "Flat", type: "Property", balance: 300000 },
          { id: "m1", name: "Halifax", type: "Mortgage", balance: -180000 },
        ],
        accountDetails: [],
      });
      const { getByLabelText } = await openEdit();
      expect(fieldValue(getByLabelText("Name"))).toBe("Halifax");
      expect(fieldValue(getByLabelText("Kind of mortgage (optional)"))).toBe(
        "residential_mortgage",
      );
      expect(fieldValue(getByLabelText("Amount owed"))).toBe("180,000");
      expect(fieldValue(getByLabelText("How it is repaid (optional)"))).toBe("interest-only");
      // 230 months, by hand: 19 years (228 months) and 2 months.
      expect(fieldValue(getByLabelText("Years left (optional)"))).toBe("19");
      expect(fieldValue(getByLabelText("Months"))).toBe("2");
      expect(hiddenValue("fixedRateEndDate")).toBe("2027-03-31");
      expect(fieldValue(getByLabelText("Which property is this mortgage on"))).toBe("p1");
      expect(fieldValue(getByLabelText("Ownership"))).toBe("joint");
      expect(fieldValue(getByLabelText("Your share"))).toBe("40");
    });

    test("with no saved balance the balance field opens empty", async () => {
      for (const account of [
        { id: "a1", name: "Easy saver", type: "Savings", balance: null },
        { id: "a1", name: "Easy saver", type: "Savings" },
      ]) {
        setLoaderData({ account, accountDetails: [] });
        const view = await openEdit();
        expect(fieldValue(view.getByLabelText("Balance"))).toBe("");
        view.unmount();
      }
    });

    test("a sole account opens as sole", async () => {
      setLoaderData({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1000 },
        accountDetails: [],
      });
      const { getByLabelText } = await openEdit();
      expect(fieldValue(getByLabelText("Ownership"))).toBe("sole");
    });

    test("a credit card: credit limit and the 0% period end", async () => {
      setLoaderData({
        account: {
          id: "c1",
          name: "Barclaycard",
          type: "Credit Card",
          balance: -1200,
          creditLimit: 5000,
          promoZeroPercentUntil: "2027-06-30",
        },
        accountDetails: [],
      });
      const { getByLabelText } = await openEdit();
      expect(fieldValue(getByLabelText("Credit limit (optional)"))).toBe("5,000");
      expect(hiddenValue("promoZeroPercentUntil")).toBe("2027-06-30");
    });

    test("a student loan: its repayment plan", async () => {
      setLoaderData({
        account: {
          id: "s1",
          name: "SLC",
          type: "Student Loan",
          balance: -25000,
          studentLoanPlan: "PLAN_2",
        },
        accountDetails: [],
      });
      const { getByLabelText } = await openEdit();
      expect(fieldValue(getByLabelText("Repayment plan"))).toBe("PLAN_2");
    });

    test("saving sends the change for this account", async () => {
      setLoaderData({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1000 },
        accountDetails: [],
      });
      const { getByLabelText, getAllByText, user } = await openEdit();
      const name = getByLabelText("Name");
      await user.clear(name);
      await user.type(name, "Rainy day");
      await user.click(getAllByText("save")[0] as HTMLElement);
      expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ intent: "update", accountId: "a1", name: "Rainy day" }),
        expect.anything(),
      );
    });
  });
});

describe("balanceDateLine", () => {
  const current = { month: 11, year: 2026 };
  test("names the month only when the figure is not from the current month", () => {
    expect(balanceDateLine({ current, latest: { month: 11, year: 2026 } })).toBeNull();
    expect(balanceDateLine({ current, latest: { month: 10, year: 2026 } })).toBe("As of October");
    expect(balanceDateLine({ current, latest: { month: 12, year: 2025 } })).toBe(
      "As of December 2025",
    );
    // The same month a year earlier is not the current month.
    expect(balanceDateLine({ current, latest: { month: 11, year: 2025 } })).toBe(
      "As of November 2025",
    );
  });
  test("says a calculated balance is calculated", () => {
    expect(
      balanceDateLine({ current, latest: { month: 11, year: 2026, source: "calculated" } }),
    ).toBe("Calculated for November");
    expect(
      balanceDateLine({ current, latest: { month: 10, year: 2026, source: "calculated" } }),
    ).toBe("Calculated for October");
  });
  test("says so when no monthly balance is recorded", () => {
    expect(balanceDateLine({ current, latest: null })).toBe("No monthly balances recorded yet");
  });
});

describe("typeSubtitle", () => {
  test("hides the type when the name contains it", () => {
    expect(typeSubtitle("Residential mortgage", "Mortgage")).toBeUndefined();
    expect(typeSubtitle("Student loan", "Student loan")).toBeUndefined();
    expect(typeSubtitle("Halifax", "Mortgage")).toBe("Mortgage");
    // A label with stray spaces still matches the name.
    expect(typeSubtitle("Residential mortgage", " Mortgage ")).toBeUndefined();
  });
});

describe("accountCounts", () => {
  test("follows the net worth choices", () => {
    expect(accountCounts("Student Loan", undefined)).toBe(false);
    expect(accountCounts("Student Loan", { countProperty: true, countStudentLoan: true })).toBe(
      true,
    );
    expect(accountCounts("Mortgage", { countProperty: false, countStudentLoan: false })).toBe(
      false,
    );
    expect(accountCounts("Property", { countProperty: false, countStudentLoan: false })).toBe(
      false,
    );
    expect(accountCounts("Current", undefined)).toBe(true);
    expect(accountCounts("Student Loan", null)).toBeNull();
  });
});

describe("ownerPageFor", () => {
  test("links mortgages to the mortgage page and debts to the debts page", () => {
    expect(ownerPageFor("Mortgage")).toEqual({ to: "/app/mortgage", label: "See your mortgage" });
    for (const type of ["Loan", "Credit Card", "Overdraft", "Student Loan"]) {
      expect(ownerPageFor(type)).toEqual({ to: "/app/debt", label: "See your debts" });
    }
    expect(ownerPageFor("Saving")).toBeNull();
  });
});
