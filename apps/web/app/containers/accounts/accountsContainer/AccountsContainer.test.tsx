import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, waitFor } from "@testing-library/react";
import mockAccounts from "__mocks__/accounts";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import customRender from "~/testUtils/customRender";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import AccountsContainer from "./AccountsContainer";

/** Loader data as the loader returns it: the saved rows and the picture's net worth from them. */
const loaderData = (rows: Record<string, unknown>) => ({
  ...rows,
  netWorth: buildWorkspacePicture(rows as Parameters<typeof buildWorkspacePicture>[0]).netWorth,
});

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  searchParams: { value: "", params: new URLSearchParams(), setParams: () => {} },
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator,

    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useLocation: () => ({ search: "", pathname: "/app/accounts" }),
    // One object per value, as the real hook keeps it between renders (a new one each render
    // would re-run the page's search-parameter effect for ever).
    useSearchParams: () => {
      if (mocks.searchParams.params.toString() !== mocks.searchParams.value) {
        mocks.searchParams.params = new URLSearchParams(mocks.searchParams.value);
      }
      return [mocks.searchParams.params, mocks.searchParams.setParams];
    },
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() }),
    useFetcher: () => ({
      submit: vi.fn(),
      state: "idle",
      data: null,
      Form: "form",
    }),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString()}`,
  }),
}));

describe("<AccountsContainer />", () => {
  test("shows an empty state with one primary add button when no accounts exist", () => {
    mocks.mockUseLoaderData.mockReturnValue(loaderData({ accounts: [] }));
    const { getByText, container } = customRender(<AccountsContainer />);
    expect(getByText("No accounts yet")).toBeDefined();
    expectPageRules(container, { maxFigures: 0 });
    expect(container.querySelectorAll('[data-variant="primary"]').length).toBe(1);
  });

  test("first view: h1, one primary button, two groups and net worth once as the one hero", () => {
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [
          { id: "a1", name: "Monzo", type: "Current", balance: 5000 },
          { id: "i1", name: "Stocks and shares ISA", type: "Investment", balance: 12000 },
          { id: "h1", name: "Home (your estimate)", type: "Property", balance: 250000 },
          { id: "m1", name: "Nationwide", type: "Mortgage", balance: -180000 },
        ],
        accountDetails: [],
      }),
    );
    const { container, getByRole, getAllByText, queryByText } = customRender(<AccountsContainer />);
    expect(getByRole("heading", { level: 1, name: "Your accounts" })).toBeDefined();
    expect(getByRole("heading", { level: 2, name: "What you own" })).toBeDefined();
    expect(getByRole("heading", { level: 2, name: "What you owe" })).toBeDefined();
    expect(getByRole("list", { name: "What you own" }).textContent).toContain(
      "Home (your estimate)",
    );
    expect(getAllByText("Total of the accounts listed")).toHaveLength(1);
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="accounts-net-worth"]')?.textContent).toContain(
      "£87,000",
    );
    // Two totals and net worth, plus one balance per account row (four here).
    expectPageRules(container, { maxFigures: 7, maxNotSet: 0, projectionNotices: 0 });
    for (const gone of [
      "Where you stand",
      "Where your assets sit",
      "ISA allowance",
      "Assets",
      "Liabilities",
    ]) {
      expect(queryByText(gone)).toBeNull();
    }
    expect(getByRole("link", { name: "See your ISA allowance" })).toBeDefined();
  });

  test("?add=property opens a home prefilled with the unlinked mortgage's share (JO-6)", () => {
    mocks.searchParams.value = "add=property";
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [
          { id: "a1", name: "Monzo", type: "Current", balance: 5000 },
          {
            id: "m1",
            name: "Nationwide",
            type: "Mortgage",
            balance: -180000,
            ownership: "joint",
            sharePercent: 40,
          },
        ],
        accountDetails: [],
      }),
    );
    try {
      const { getByRole, getByLabelText } = customRender(<AccountsContainer />);
      expect(getByRole("dialog")).toBeDefined();
      expect((getByLabelText("Name") as HTMLInputElement).value).toBe("Home (your estimate)");
      expect((getByLabelText("Account type") as HTMLSelectElement).value).toBe("Property");
      expect((getByLabelText("Home or rental") as HTMLSelectElement).value).toBe("home");
      expect((getByLabelText("Ownership") as HTMLSelectElement).value).toBe("joint");
      expect((getByLabelText("Your share") as HTMLInputElement).value).toBe("40");
    } finally {
      mocks.searchParams.value = "";
    }
  });

  test("should open modal to add an account", async () => {
    mocks.mockUseLoaderData.mockReturnValue(loaderData({ accounts: mockAccounts }));
    const { getAllByText } = customRender(<AccountsContainer />);
    const addAccountModalBtn = getAllByText("addAccount")[0];
    expect(addAccountModalBtn).toBeDefined();
    fireEvent.click(addAccountModalBtn);
    await waitFor(() => {
      expect(getAllByText("addAccount")[0]).toBeDefined();
    });
  });

  const netWorthText = (container: HTMLElement) =>
    container.querySelector('[data-testid="accounts-net-worth"]')?.textContent ?? "";

  test("counts a negative stored liability as money owed, reducing net worth", () => {
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [
          { id: "a1", name: "Current", type: "Current", balance: 5000 },
          { id: "d1", name: "Barclaycard", type: "Credit Card", balance: -1200 },
          { id: "d2", name: "Arranged overdraft", type: "Overdraft", balance: -300 },
        ],
        accountDetails: [],
      }),
    );
    const { container } = customRender(<AccountsContainer />);
    const text = container.textContent ?? "";
    expect(text).toContain("£1,500");
    expect(netWorthText(container)).toContain("£3,500");
    expect(text).not.toContain("£-");
  });

  test("counts Property as an asset, not a liability", () => {
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [
          { id: "a1", name: "Current", type: "Current", balance: 5000 },
          { id: "p1", name: "House", type: "Property", balance: 250000 },
          { id: "m1", name: "Mortgage", type: "Mortgage", balance: -100000 },
        ],
        accountDetails: [],
      }),
    );
    const { container } = customRender(<AccountsContainer />);
    expect(container.textContent).toContain("£255,000");
    expect(netWorthText(container)).toContain("£155,000");
  });

  test("counts Owed (money owed to the user) as something you own", () => {
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [
          { id: "a1", name: "Current", type: "Current", balance: 5000 },
          { id: "w1", name: "John Smith", type: "Owed", balance: 500 },
          { id: "m1", name: "Card", type: "Credit Card", balance: -1000 },
        ],
        accountDetails: [],
      }),
    );
    const { container, getByRole } = customRender(<AccountsContainer />);
    expect(getByRole("list", { name: "What you own" }).textContent).toContain("John Smith");
    expect(container.textContent).toContain("£5,500");
    expect(netWorthText(container)).toContain("£4,500");
  });

  test("excludes a Student Loan from net worth and says so", () => {
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [
          { id: "a1", name: "Current", type: "Current", balance: 5000 },
          { id: "s1", name: "SLC", type: "Student Loan", balance: -40000 },
        ],
        accountDetails: [],
      }),
    );
    const { container, getByText, getByRole } = customRender(<AccountsContainer />);
    expect(getByText(/Repayments come out of your pay as you earn/)).toBeDefined();
    expect(netWorthText(container)).toContain("£5,000");
    expect(getByRole("list", { name: "Not counted in net worth" }).textContent).toContain("SLC");
  });

  test("never shows bank connections, even when bank sync is enabled (deferred)", () => {
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
        bankConnections: [
          {
            id: "c1",
            institutionName: "Monzo Bank",
            status: "connected",
            lastSyncedAt: "2026-11-04T12:00:00Z",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
        bankConnectionsEnabled: true,
      }),
    );
    const { queryByText } = customRender(<AccountsContainer />);
    expect(queryByText("Connected banks")).toBeNull();
    expect(queryByText("Monzo Bank")).toBeNull();
  });

  test("header has Start monthly check-in and Add account, with no View history", () => {
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
        accountDetails: [],
      }),
    );
    const { getByTestId, queryByText, container } = customRender(<AccountsContainer />);
    expect(getByTestId("accounts-open-check-in").textContent).toBe("Start monthly check-in");
    expect(queryByText("View history")).toBeNull();
    expect(container.querySelectorAll('[data-variant="primary"]').length).toBe(1);
  });

  test("a phone-only Start monthly check-in button sits under net worth", () => {
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({
        accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
        accountDetails: [],
      }),
    );
    const { getByTestId } = customRender(<AccountsContainer />);
    expect(getByTestId("accounts-open-check-in-phone").textContent).toBe("Start monthly check-in");
  });

  test("a home value saved on the profile hides the not-counted home notice (P41)", () => {
    // A mortgage with no Property account: without a saved home value, net worth says the home
    // is not counted; with one saved on the profile, that notice is not shown.
    const accounts = [
      { id: "a1", name: "Current", type: "Current", balance: 5000 },
      { id: "m1", name: "Mortgage", type: "Mortgage", balance: -150000 },
    ];
    mocks.mockUseLoaderData.mockReturnValue(
      loaderData({ accounts, accountDetails: [], userProfile: { homeValue: null } }),
    );
    const without = customRender(<AccountsContainer />);
    expect(without.queryByText(/not counted until you add an estimate/)).not.toBeNull();
    without.unmount();

    mocks.mockUseLoaderData.mockReturnValue({
      ...loaderData({ accounts, accountDetails: [], userProfile: { homeValue: null } }),
      userProfile: { homeValue: 250000 },
    });
    const withHome = customRender(<AccountsContainer />);
    expect(withHome.queryByText(/not counted until you add an estimate/)).toBeNull();
  });
  describe("arrival parameters and the check-in", () => {
    const oneAccount = () =>
      loaderData({
        accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
        accountDetails: [],
      });
    const withParams = (value: string) => {
      mocks.searchParams.value = value;
      const setParams = vi.fn();
      mocks.searchParams.setParams = setParams;
      return setParams;
    };
    afterEach(() => {
      mocks.searchParams.value = "";
      mocks.searchParams.setParams = () => {};
    });

    test("?add=1 opens a blank add dialog, then removes the parameter so a reload does not reopen", () => {
      const setParams = withParams("add=1&tab=x");
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const { getByRole, getByLabelText } = customRender(<AccountsContainer />);
      expect(getByRole("dialog")).toBeDefined();
      // A plain add: no home prefill.
      expect((getByLabelText("Name") as HTMLInputElement).value).toBe("");
      expect((getByLabelText("Account type") as HTMLSelectElement).value).not.toBe("Property");
      expect(setParams).toHaveBeenCalledTimes(1);
      const [next, options] = setParams.mock.calls[0] as [URLSearchParams, object];
      // Other parameters stay; only "add" and "checkIn" go.
      expect(next.toString()).toBe("tab=x");
      expect(options).toEqual({ replace: true, preventScrollReset: true });
    });

    test("any other add value opens nothing", () => {
      withParams("add=2");
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const { queryByRole } = customRender(<AccountsContainer />);
      expect(queryByRole("dialog")).toBeNull();
    });

    test("with no arrival parameter the address is left alone", () => {
      const setParams = withParams("tab=x");
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const { queryByRole } = customRender(<AccountsContainer />);
      expect(queryByRole("dialog")).toBeNull();
      expect(setParams).not.toHaveBeenCalled();
    });

    test("?checkIn=1 opens the check-in and removes the parameter", () => {
      const setParams = withParams("checkIn=1");
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const { getByRole } = customRender(<AccountsContainer />);
      expect(getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
      const [next] = setParams.mock.calls[0] as [URLSearchParams];
      expect(next.has("checkIn")).toBe(false);
    });

    test("Start monthly check-in opens the check-in in place, without following the link", () => {
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const { getByTestId, getByRole, queryByRole } = customRender(<AccountsContainer />);
      expect(queryByRole("dialog")).toBeNull();
      const link = getByTestId("accounts-open-check-in");
      const notPrevented = fireEvent.click(link);
      expect(notPrevented).toBe(false);
      expect(getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
    });

    test("closing the check-in returns focus to Start monthly check-in", async () => {
      withParams("checkIn=1");
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const { getByRole, getByTestId } = customRender(<AccountsContainer />);
      const dialog = getByRole("dialog", { name: "Monthly check-in" });
      fireEvent.keyDown(dialog, { key: "Escape" });
      await waitFor(() =>
        expect(document.activeElement).toBe(getByTestId("accounts-open-check-in")),
      );
    });

    test("a later ?add=property on the open page opens the add dialog prefilled as a home", async () => {
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const view = customRender(<AccountsContainer />);
      expect(view.queryByRole("dialog")).toBeNull();
      withParams("add=property");
      view.rerender(<AccountsContainer />);
      await waitFor(() => expect(view.getByRole("dialog")).toBeDefined());
      expect((view.getByLabelText("Name") as HTMLInputElement).value).toBe("Home (your estimate)");
      expect((view.getByLabelText("Account type") as HTMLSelectElement).value).toBe("Property");
    });

    test("a later ?add=1 after ?add=property leaves the home prefill behind", async () => {
      withParams("add=property");
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const view = customRender(<AccountsContainer />);
      expect((view.getByLabelText("Account type") as HTMLSelectElement).value).toBe("Property");
      fireEvent.keyDown(view.getByRole("dialog"), { key: "Escape" });
      await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
      withParams("add=1");
      view.rerender(<AccountsContainer />);
      fireEvent.click(view.getAllByText("addAccount")[0] as HTMLElement);
      await waitFor(() => expect(view.getByRole("dialog")).toBeDefined());
      expect((view.getByLabelText("Account type") as HTMLSelectElement).value).not.toBe("Property");
    });

    test("the list follows new loader data after a reload", () => {
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const view = customRender(<AccountsContainer />);
      expect(view.getByRole("list", { name: "What you own" }).textContent).not.toContain("Savings");
      mocks.mockUseLoaderData.mockReturnValue(
        loaderData({
          accounts: [
            { id: "a1", name: "Current", type: "Current", balance: 5000 },
            { id: "s1", name: "Savings", type: "Savings", balance: 2000 },
          ],
          accountDetails: [],
        }),
      );
      view.rerender(<AccountsContainer />);
      expect(view.getByRole("list", { name: "What you own" }).textContent).toContain("Savings");
    });

    test("a newly added mortgage's share reaches the home prefill after a reload", async () => {
      mocks.mockUseLoaderData.mockReturnValue(oneAccount());
      const view = customRender(<AccountsContainer />);
      mocks.mockUseLoaderData.mockReturnValue(
        loaderData({
          accounts: [
            { id: "a1", name: "Current", type: "Current", balance: 5000 },
            {
              id: "m1",
              name: "Nationwide",
              type: "Mortgage",
              balance: -180000,
              ownership: "joint",
              sharePercent: 40,
            },
          ],
          accountDetails: [],
        }),
      );
      view.rerender(<AccountsContainer />);
      withParams("add=property");
      view.rerender(<AccountsContainer />);
      await waitFor(() => expect(view.getByRole("dialog")).toBeDefined());
      expect((view.getByLabelText("Ownership") as HTMLSelectElement).value).toBe("joint");
    });

    test("loader data with no accounts key shows the empty state and no header actions", () => {
      mocks.mockUseLoaderData.mockReturnValue({ netWorth: null });
      const { getByText, queryByTestId } = customRender(<AccountsContainer />);
      expect(getByText("No accounts yet")).toBeDefined();
      expect(queryByTestId("accounts-open-check-in")).toBeNull();
    });

    describe("the month's summary", () => {
      const [year, month] = londonMonth().split("-").map(Number) as [number, number];
      // The month before the current one, worked by hand: January steps back to December.
      const previous =
        month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
      const recordedThisMonth = (latestCheckInMonth: string | null) =>
        loaderData({
          accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
          accountDetails: [{ accountId: "a1", year, month, value: 5000 }],
          latestCheckInMonth,
        });

      test("opens on the summary when this month's check-in is finished", () => {
        withParams("checkIn=1");
        mocks.mockUseLoaderData.mockReturnValue(recordedThisMonth(londonMonth()));
        const { getByRole } = customRender(<AccountsContainer />);
        expect(getByRole("heading", { name: /is checked in\./ })).toBeDefined();
      });

      test("does not when the last finished check-in was an earlier month", () => {
        withParams("checkIn=1");
        mocks.mockUseLoaderData.mockReturnValue(recordedThisMonth(previous));
        const { queryByRole } = customRender(<AccountsContainer />);
        expect(queryByRole("heading", { name: /is checked in\./ })).toBeNull();
      });

      test("does not when no check-in was ever finished", () => {
        withParams("checkIn=1");
        mocks.mockUseLoaderData.mockReturnValue(recordedThisMonth(null));
        const { queryByRole } = customRender(<AccountsContainer />);
        expect(queryByRole("heading", { name: /is checked in\./ })).toBeNull();
      });
    });
  });
});
