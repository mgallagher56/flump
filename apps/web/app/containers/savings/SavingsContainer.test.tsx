import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSubmit = vi.hoisted(() => vi.fn());
const mockLocation = vi.hoisted(() => ({
  current: { pathname: "/app/savings", hash: "", state: null as unknown },
}));

/** Realistic filled fixture: £21,000 at 4%, £300 a month (of which £200 into an ISA). */
const FILLED = [
  {
    id: "acc-1",
    name: "Easy access saver",
    type: "Saving",
    balance: 9000,
    interestRate: 4,
    monthlyContribution: 100,
  },
  {
    id: "acc-2",
    name: "Cash ISA",
    type: "Saving",
    balance: 12000,
    interestRate: 4,
    monthlyContribution: 200,
  },
];

const loader = vi.hoisted(() => ({ accounts: [] as unknown[] }));

vi.mock("react-router", async () => {
  // The loader sends the shared picture's savings figures (audit slice 3); built here the same
  // way from the same accounts.
  const { buildWorkspacePicture } = await vi.importActual<
    typeof import("~/utils/financialPicture")
  >("~/utils/financialPicture");
  return {
    useInRouterContext: () => false,
    useLoaderData: () => {
      const picture = buildWorkspacePicture({ accounts: loader.accounts as never });
      return {
        accounts: loader.accounts,
        accountDetails: [],
        budgetEntries: [],
        userProfile: { setupChecklistCompletedSteps: [] },
        savingsBalance: picture.savings.balance,
        isaAllowanceUsed: picture.isaAllowanceUsed,
      };
    },
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation.current,
    useFetcher: () => ({ submit: mockSubmit, state: "idle", data: null }),
    Link: ({ to, children, ...rest }: any) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/hooks/useUserProfile")>();
  return {
    ...actual,
    useUserProfile: () => ({
      profile: { setupChecklistCompletedSteps: [] },
      setProfile: vi.fn(),
      markChecklistStep: vi.fn().mockResolvedValue({}),
    }),
  };
});

vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

import { INTEREST_LABEL } from "~/features/savings/components/SavingsSummaryCards/SavingsSummaryCards";
import SavingsContainer, { parsePayRise, withFullStop } from "./SavingsContainer";

const zone = () => screen.getByRole("region", { name: "Model a change to your savings" });

/** The disclosure button: the zone sits closed below saved figures. */
const modelToggle = () => screen.getByRole("button", { name: "Show what-if: grow your savings" });
const openModel = () => fireEvent.click(modelToggle());

/** The saved facts: hero plus KPI strip. */
const savedFacts = () =>
  [
    screen.getByTestId("hero-figure").textContent,
    screen.getByText("Saved each month").closest("[data-density]")?.textContent,
  ].join("|");

describe("SavingsContainer", () => {
  afterEach(() => {
    loader.accounts = FILLED;
    mockLocation.current = { pathname: "/app/savings", hash: "", state: null };
    mockSubmit.mockClear();
  });
  loader.accounts = FILLED;

  it("shows the h1, one hero and up to 3 real KPIs, and keeps the page rules", () => {
    const { container } = render(<SavingsContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Your savings" })).toBeDefined();
    expect(screen.getByTestId("hero-figure").textContent).toContain("£21,000");
    expect(screen.getByText("Saved each month")).toBeDefined();
    // Interest in pounds, split by ISA status, replaces a blended rate.
    expect(screen.getByText("Interest over the next 12 months")).toBeDefined();
    expect(screen.getByText("An estimate, before tax. ISA interest is tax-free.")).toBeDefined();
    expect(screen.queryByText("Average rate")).toBeNull();
    // A page with accounts still shows its page icon in the header.
    expect(container.querySelectorAll("svg[data-scene]")).toHaveLength(1);
    expect(container.querySelector("[data-testid=page-header-illustration]")).not.toBeNull();
    expect(screen.getByText("Paid into ISAs this tax year")).toBeDefined();
    // The allowance is shown once, as the KPI: no second ISA bar in the accounts card.
    expect(screen.queryByTestId("isa-allowance")).toBeNull();
    expect(container.textContent).not.toContain("unused");
    expect(screen.queryByText("Weighted by balance (AER)")).toBeNull();
    expect(screen.queryByText("Where you stand")).toBeNull();
    expect(screen.queryByText("Milestones")).toBeNull();
    // Closed, nothing is projected, so no notice is needed yet.
    expectPageRules(container, { maxFigures: 12, maxNotSet: 0, projectionNotices: 0 });
    openModel();
    expect(screen.getAllByRole("region", { name: "Model a change to your savings" })).toHaveLength(
      1,
    );
    expectPageRules(container, { maxFigures: 12, maxNotSet: 0, projectionNotices: 1 });
  });

  it("puts the one notice in the zone footer, below the h1", () => {
    render(<SavingsContainer />);
    openModel();
    const notes = screen.getAllByRole("note", { name: "Guidance, not advice" });
    expect(notes).toHaveLength(1);
    expect(screen.getByTestId("scenario-zone-footer").contains(notes[0] as Node)).toBe(true);
  });

  it("starts the model closed below saved figures, and opens it from a named toggle", () => {
    render(<SavingsContainer />);
    const toggle = modelToggle();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText(/^Starts from your savings of/)).toBeDefined();
    expect(screen.queryByRole("slider")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(zone()).toBeDefined();
    expect(screen.getAllByRole("slider").length).toBeGreaterThan(0);
  });

  it("opens the model straight away when a pay rise is handed over", () => {
    mockLocation.current = { pathname: "/app/savings", hash: "", state: { payRise: 230 } };
    render(<SavingsContainer />);
    // Open, the same button reads "Hide what-if".
    expect(screen.queryByRole("button", { name: "Show what-if: grow your savings" })).toBeNull();
    expect(screen.getByRole("button", { name: "Hide what-if" }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(screen.getAllByRole("slider").length).toBeGreaterThan(0);
  });

  it("has no slider outside the scenario zone", () => {
    render(<SavingsContainer />);
    openModel();
    for (const slider of screen.getAllByRole("slider")) {
      expect(zone().contains(slider)).toBe(true);
    }
  });

  it("never shows a £0 or 0.00% KPI when monthly amounts and rates are not set", () => {
    loader.accounts = [{ id: "a", name: "Saver", type: "Saving", balance: 5000 }];
    const { container } = render(<SavingsContainer />);
    openModel();
    expect(screen.getByText(/Add what you save each month and your interest rates/)).toBeDefined();
    expect(screen.queryByText("Saved each month")).toBeNull();
    expect(container.textContent).not.toContain("0.00%");
    // £0 a month and no rate: no chart, a prompt instead (P10.6).
    expect(screen.queryByTestId("savings-forecast-outcome")).toBeNull();
    expect(
      screen.getAllByText(
        "Add a monthly amount or an interest rate to see how your savings could grow.",
      ).length,
    ).toBeGreaterThan(0);
    expectPageRules(container, { maxFigures: 12, projectionNotices: 1 });
  });

  it("counts a joint account's balance, monthly saving and interest all at the user's share", () => {
    // 50% joint: whole balance £10,000 and whole saving £200 a month, at 5% AER.
    //   Balance at share: 10,000 × 0.5 = £5,000. Saved each month at share: 200 × 0.5 = £100.
    //   Interest: 5,000 × 0.05 = £250, plus £100 a month for 12 months at
    //   r = 1.05^(1/12) − 1 ≈ 0.0040741: 100 × (0.05 / r) − 1,200 ≈ 1,227.26 − 1,200 = £27.26.
    //   Total ≈ £277.26, shown as £277.
    loader.accounts = [
      {
        id: "joint",
        name: "Joint saver",
        type: "Saving",
        accountSubtype: "easy_access",
        balance: 10000,
        interestRate: 5,
        monthlyContribution: 200,
        ownership: "joint",
        sharePercent: 50,
      },
    ];
    render(<SavingsContainer />);
    expect(screen.getByTestId("hero-figure").textContent).toContain("£5,000");
    expect(screen.getByText("Saved each month").closest("[data-density]")?.textContent).toContain(
      "£100",
    );
    expect(screen.getByText(INTEREST_LABEL).closest("[data-density]")?.textContent).toContain(
      "£277",
    );
  });

  it("shows only the header and one empty state with no accounts", () => {
    loader.accounts = [];
    const { container } = render(<SavingsContainer />);
    expect(screen.getByText("No savings accounts yet")).toBeDefined();
    // One illustration in view: the page icon in the header, none in the empty state.
    expect(container.querySelectorAll("svg[data-scene]")).toHaveLength(1);
    expect(container.querySelector("[data-testid=page-header-illustration]")).not.toBeNull();
    expect(screen.queryByRole("region", { name: "Model a change to your savings" })).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByTestId("hero-figure")).toBeNull();
    expectPageRules(container, { maxFigures: 0, maxNotSet: 0, projectionNotices: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Add an account" }));
    expect(screen.getByRole("dialog", { name: "Add a savings account" })).toBeDefined();
  });

  it("redirects the old #takehome link to the Take-home pay page", () => {
    window.location.hash = "#takehome";
    mockNavigate.mockClear();
    render(<SavingsContainer />);
    expect(mockNavigate).toHaveBeenCalledWith("/app/take-home", { replace: true });
    window.location.hash = "";
  });

  it("ends the illustration summary with one full stop", () => {
    // forecastOutcomeText has none ("£12,000 in 5 years"); depositOutcomeText may ("... target.").
    expect(withFullStop("£12,000 in 5 years")).toBe("£12,000 in 5 years.");
    expect(withFullStop("Your starting amount already meets this target.")).toBe(
      "Your starting amount already meets this target.",
    );
  });

  it("parses a pay rise handed over from Take-home pay in router state", () => {
    expect(parsePayRise({ payRise: 150.4 })).toBe(150);
    expect(parsePayRise(null)).toBe(0);
    expect(parsePayRise({ payRise: -5 })).toBe(0);
    expect(parsePayRise({ payRise: "abc" })).toBe(0);
  });

  describe("saved versus scenario", () => {
    it("moving the forecast inputs never changes the hero, the KPIs or saved data", () => {
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      render(<SavingsContainer />);
      openModel();
      const before = savedFacts();
      const outcomeBefore = screen.getByTestId("savings-forecast-outcome").textContent;

      fireEvent.change(screen.getByLabelText("Rate (AER)"), {
        target: { value: "6" },
      });
      fireEvent.change(screen.getByLabelText("Years ahead"), {
        target: { value: "12" },
      });
      fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "800" } });
      fireEvent.click(screen.getByRole("button", { name: /Goal and inflation options/ }));
      fireEvent.click(screen.getByLabelText("Show in today's money"));

      expect(screen.getByTestId("savings-forecast-outcome").textContent).not.toBe(outcomeBefore);
      expect(savedFacts()).toBe(before);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("?"));

      const reset = screen.getByRole("button", { name: "Reset to saved figures" });
      expect(reset.hasAttribute("disabled")).toBe(false);
      fireEvent.click(reset);
      expect(screen.getByTestId("savings-forecast-outcome").textContent).toBe(outcomeBefore);
      setItem.mockRestore();
    });

    it("shows a handed-over pay rise as a removable input in the zone only", () => {
      const { rerender } = render(<SavingsContainer />);
      openModel();
      const before = savedFacts();
      mockLocation.current = { pathname: "/app/savings", hash: "", state: { payRise: 230 } };
      rerender(<SavingsContainer />);
      expect(zone().textContent).toContain("Pay rise from the take-home pay tool:");
      expect(screen.getByText("£2,760")).toBeDefined();
      expect(screen.getAllByText("Illustration, not saved")).toHaveLength(1);
      expect(savedFacts()).toBe(before);

      expect(zone().textContent).toContain("Pay rise from the take-home pay tool:");
      fireEvent.click(screen.getByRole("button", { name: "Remove pay rise" }));
      expect(screen.queryByText(/Pay rise from the take-home pay tool:/)).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/app/savings", {
        replace: true,
        state: null,
        preventScrollReset: true,
      });
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("counts a handed-over pay rise as a change, and Reset clears it", () => {
      mockLocation.current = { pathname: "/app/savings", hash: "", state: { payRise: 230 } };
      render(<SavingsContainer />);
      const reset = screen.getByRole("button", { name: "Reset to saved figures" });
      expect(reset.hasAttribute("disabled")).toBe(false);
      fireEvent.click(reset);
      expect(screen.queryByText(/Pay rise from the take-home pay tool:/)).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/app/savings", {
        replace: true,
        state: null,
        preventScrollReset: true,
      });
      expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("models a target in the second tool, seeded from saved figures, and never saves it", () => {
      render(<SavingsContainer />);
      openModel();
      const tab = screen.getByRole("tab", { name: "Time to a target" });
      fireEvent.pointerDown(tab, { button: 0 });
      fireEvent.keyDown(tab, { key: "Enter", code: "Enter" });
      fireEvent.mouseDown(tab);
      // The tool opens on a default target (the next round £5,000 above the saved total).
      const target = screen.getByLabelText("Target amount") as HTMLInputElement;
      expect(target.value).toBe("25000");
      expect(screen.getByTestId("deposit-timeline-outcome").textContent).not.toBe(
        "Enter a target amount to see an estimate.",
      );
      expect((screen.getByLabelText("Monthly saving") as HTMLInputElement).value).toMatch(/300/);
      fireEvent.change(target, { target: { value: "31000" } });
      expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe("2 years 10 months");
      expect(screen.getByText("Time to your target, not counting interest")).toBeDefined();
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  it("shows the stale-rates banner when the calendar is past the latest supported tax year", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-06-01T12:00:00Z"));
    try {
      render(<SavingsContainer />);
      expect(screen.getByText(/Using 2026\/27 rates/)).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
