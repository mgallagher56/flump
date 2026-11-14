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

vi.mock("react-router", () => ({
  useInRouterContext: () => false,
  useLoaderData: () => ({
    accounts: loader.accounts,
    accountDetails: [],
    budgetEntries: [],
    userProfile: { setupChecklistCompletedSteps: [] },
  }),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation.current,
  useFetcher: () => ({ submit: mockSubmit, state: "idle", data: null }),
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

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

import SavingsContainer, { parsePayRise } from "./SavingsContainer";

const zone = () => screen.getByRole("region", { name: "Model a change to your savings" });

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
    expect(screen.getByText("Average rate")).toBeDefined();
    expect(screen.getByText("4%")).toBeDefined();
    expect(screen.getByText("ISA allowance used")).toBeDefined();
    expect(screen.queryByText("Weighted by balance (AER)")).toBeNull();
    expect(screen.queryByText("Where you stand")).toBeNull();
    expect(screen.queryByText("Milestones")).toBeNull();
    expect(screen.getAllByRole("region", { name: "Model a change to your savings" })).toHaveLength(
      1,
    );
    expectPageRules(container, { maxFigures: 12, maxNotSet: 0, projectionNotices: 1 });
  });

  it("puts the one notice in the zone footer, below the h1", () => {
    render(<SavingsContainer />);
    const notes = screen.getAllByRole("note", { name: "Guidance, not advice" });
    expect(notes).toHaveLength(1);
    expect(screen.getByTestId("scenario-zone-footer").contains(notes[0] as Node)).toBe(true);
  });

  it("has no slider outside the scenario zone", () => {
    render(<SavingsContainer />);
    for (const slider of screen.getAllByRole("slider")) {
      expect(zone().contains(slider)).toBe(true);
    }
  });

  it("never shows a £0 or 0.00% KPI when monthly amounts and rates are not set", () => {
    loader.accounts = [{ id: "a", name: "Saver", type: "Saving", balance: 5000 }];
    const { container } = render(<SavingsContainer />);
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

  it("shows only the header and one empty state with no accounts", () => {
    loader.accounts = [];
    const { container } = render(<SavingsContainer />);
    expect(screen.getByText("No savings accounts yet")).toBeDefined();
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
      const before = savedFacts();
      const outcomeBefore = screen.getByTestId("savings-forecast-outcome").textContent;

      fireEvent.change(screen.getByLabelText("Interest rate (AER) range slider"), {
        target: { value: "6" },
      });
      fireEvent.change(screen.getByLabelText("Years ahead range slider"), {
        target: { value: "12" },
      });
      fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "800" } });
      fireEvent.click(screen.getByRole("button", { name: /More options/ }));
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
      const before = savedFacts();
      mockLocation.current = { pathname: "/app/savings", hash: "", state: { payRise: 230 } };
      rerender(<SavingsContainer />);
      expect(zone().textContent).toContain("Pay rise from the take-home pay tool:");
      expect(screen.getByText("£2,760")).toBeDefined();
      expect(screen.getAllByText("Illustration, not saved")).toHaveLength(1);
      expect(savedFacts()).toBe(before);

      fireEvent.click(screen.getByRole("button", { name: "Remove pay rise" }));
      expect(screen.queryByText(/Pay rise from the take-home pay tool:/)).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/app/savings", { replace: true, state: null });
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("models a target in the second tool, seeded from saved figures, and never saves it", () => {
      render(<SavingsContainer />);
      const tab = screen.getByRole("tab", { name: "Time to a target" });
      fireEvent.pointerDown(tab, { button: 0 });
      fireEvent.keyDown(tab, { key: "Enter", code: "Enter" });
      fireEvent.mouseDown(tab);
      const target = screen.getByLabelText("Target amount") as HTMLInputElement;
      expect(target.value).toBe("");
      expect((screen.getByLabelText("Monthly saving") as HTMLInputElement).value).toMatch(/300/);
      fireEvent.change(target, { target: { value: "31000" } });
      expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe(
        "Estimated time to reach target: 2 years 10 months",
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });
});
