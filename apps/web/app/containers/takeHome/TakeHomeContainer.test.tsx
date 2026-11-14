import { expectPageRules, findFigures } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
const profileState: { profile: Record<string, unknown> } = { profile: {} };

const SAVED_PROFILE = {
  annualSalary: 45000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  pensionPercent: 5,
  isSalarySacrifice: false,
  studentLoanPlans: ["PLAN_2"],
};

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useLoaderData: () => ({ userProfile: profileState.profile }),
  useNavigate: () => navigate,
}));
vi.mock("~/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ profile: profileState.profile, setProfile: vi.fn() }),
}));
vi.mock("~/state/baseline.store", () => ({
  useFinancialBaseline: () => ({ baseline: { annualGrossSalary: 0 } }),
}));

import TakeHomeContainer from "./TakeHomeContainer";

const PAY_PARTS = [
  "Income Tax",
  "National Insurance",
  "Pension",
  "Student loan",
  "What you take home",
];

describe("<TakeHomeContainer /> with saved figures", () => {
  beforeEach(() => {
    navigate.mockClear();
    profileState.profile = { ...SAVED_PROFILE };
  });

  it("meets the page rules: figure budget, one hero, one notice, at most one primary button", () => {
    const { container } = render(<TakeHomeContainer />);
    expectPageRules(container, { maxFigures: 9, maxNotSet: 0, projectionNotices: 1 });
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Take-home pay" })).toBeDefined();
  });

  it("shows no pence on any figure", () => {
    const { container } = render(<TakeHomeContainer />);
    const money = findFigures(container).filter((f) => f.kind === "money");
    expect(money.length).toBeGreaterThan(0);
    for (const f of money) expect(f.text).not.toMatch(/\.\d{2}\b/);
    expect(container.textContent).not.toMatch(/£[\d,]+\.\d{2}\b/);
  });

  it("names each pay part exactly once, and prints the take-home estimate once", () => {
    const { container } = render(<TakeHomeContainer />);
    const text = container.textContent ?? "";
    // As a label (its own element), each part appears once.
    const counts = PAY_PARTS.map((label) => [
      label,
      screen.getAllByText(new RegExp(`^${label}`)).length,
    ]);
    expect(counts).toEqual(PAY_PARTS.map((label) => [label, 1]));
    expect(text).not.toMatch(/You take home/);
    let card: HTMLElement | null = screen.getByText("Monthly take-home");
    while (card && !/£/.test(card.textContent ?? "")) card = card.parentElement;
    const amount = /£[\d,]+/.exec(card?.textContent ?? "")?.[0];
    expect(amount).toBeDefined();
    expect(findFigures(container).filter((f) => f.text === amount)).toHaveLength(1);
  });

  it("the hero is the saved salary; the take-home estimate is the first KPI, tagged Estimate", () => {
    const { container } = render(<TakeHomeContainer />);
    const hero = container.querySelector('[data-tone="hero"]')?.textContent ?? "";
    expect(hero).toContain("Salary before tax");
    expect(hero).toContain("£45,000");
    expect(hero).not.toMatch(/Estimate|take-home/i);
    expect(screen.getByText("Estimate")).toBeDefined();
    expect(screen.getByText("Monthly take-home")).toBeDefined();
  });

  it("keeps the saved breakdown outside the scenario zone, which holds only the two what-ifs", () => {
    render(<TakeHomeContainer />);
    const zone = screen.getByTestId("scenario-zone");
    const breakdown = screen.getByTestId("take-home-breakdown");
    expect(zone.contains(breakdown)).toBe(false);
    expect(zone.contains(screen.getByTestId("hero-figure"))).toBe(false);
    expect(
      within(zone)
        .getAllByRole("tab")
        .map((t) => t.textContent),
    ).toEqual(["A pay rise", "The next £1,000"]);
    // The one notice sits in the zone and carries the "Unverified estimate" sentence.
    const notice = within(zone).getByRole("note");
    expect(notice.textContent).toMatch(/^Unverified estimate\./);
  });

  it("has no weekly or daily strip, no £100,000 line and no bottom disclaimer", () => {
    const { container } = render(<TakeHomeContainer />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Weekly|Daily|Where you stand|100,000|for guidance only/);
    expect(text).not.toMatch(/gross|Qualifying/i);
  });

  it("puts the share not taken home and pay after pension under Show details", () => {
    render(<TakeHomeContainer />);
    expect(screen.queryByText("Pay after pension, before tax")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(screen.getByText("Pay after pension, before tax")).toBeDefined();
    expect(screen.getByText("Share of pay not taken home")).toBeDefined();
  });

  it("sends 'Model this in savings' to the forecaster with the monthly change, by router state", () => {
    render(<TakeHomeContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Model this in savings" }));
    expect(navigate).toHaveBeenCalledTimes(1);
    const [to, opts] = navigate.mock.calls[0];
    expect(to).toBe("/app/savings#forecast");
    expect(opts.state.payRise).toBeGreaterThan(0);
  });
});

describe("<TakeHomeContainer /> without a saved salary", () => {
  beforeEach(() => {
    profileState.profile = { ...SAVED_PROFILE, annualSalary: null };
  });

  it("shows one setup prompt with one button, and no £0 figures, tabs or zone", () => {
    const { container } = render(<TakeHomeContainer />);
    expectPageRules(container, { maxFigures: 0, projectionNotices: 0 });
    expect(screen.getByText(/Add your salary before tax/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Add salary" }).getAttribute("href")).toBe(
      "/app/profile",
    );
    expect(screen.queryByTestId("scenario-zone")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(container.textContent).not.toContain("£0");
  });
});
