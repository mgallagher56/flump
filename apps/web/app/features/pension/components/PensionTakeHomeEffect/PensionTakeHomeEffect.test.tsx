import {
  incomeScenarioFromFacts,
  type ProfileFacts,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import { formatMoney } from "@repo/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computePensionTakeHomeEffect,
  PENSION_TAKE_HOME_COPY,
  PensionTakeHomeEffect,
} from "./PensionTakeHomeEffect";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const FACTS: ProfileFacts = {
  annualSalary: 60_000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: true,
};

const renderEffect = (facts: ProfileFacts, deltaYear: number) =>
  render(<PensionTakeHomeEffect effect={computePensionTakeHomeEffect(facts, deltaYear)} />);

afterEach(() => {
  vi.useRealTimers();
});

describe("<PensionTakeHomeEffect />", () => {
  it("shows the engine's monthly take-home change as the one outcome figure", () => {
    renderEffect(FACTS, 2400);
    const expected = whatIfSacrificeChange(incomeScenarioFromFacts(FACTS).scenario, 2400);
    const outcome = document.querySelector('[data-figure="takeHome.delta"]');
    expect(outcome?.textContent).toBe(
      `${formatMoney(expected.deltaTakeHome / 12, { fractionDigits: 0, signDisplay: "always" }).text} a month`,
    );
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.reachesPension)).toBeDefined();
    // The method sits behind the "i" beside the label (owner item 23), not as a paragraph.
    expect(screen.queryByText(PENSION_TAKE_HOME_COPY.methodSalarySacrifice)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "About How the change is paid" }));
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.methodSalarySacrifice)).toBeDefined();
  });

  it("uses net pay when the saved contribution is not salary sacrifice", () => {
    renderEffect({ ...FACTS, isSalarySacrifice: false }, 2400);
    fireEvent.click(screen.getByRole("button", { name: "About How the change is paid" }));
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.methodNetPay)).toBeDefined();
  });

  it("reads No change in the outcome slot when the contribution matches the saved figure", () => {
    renderEffect(FACTS, 0);
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.outcomeLabel)).toBeDefined();
    expect(document.querySelector('[data-figure="takeHome.delta"]')?.textContent).toBe("No change");
    // Words at body size, not a hero-size figure, until an input moves.
    const noChange = document.querySelector('[data-figure="takeHome.delta"]');
    expect(noChange?.className).toContain("textStyle_body.md");
    expect(noChange?.className).not.toContain("textStyle_numeric.kpi");
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.noChange)).toBeDefined();
  });

  it("points to Profile when a needed fact is missing, with no figure", () => {
    renderEffect({ ...FACTS, employmentType: null }, 2400);
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe(
      "/app/profile#settings-age-and-pay",
    );
    expect(document.querySelector('[data-figure="takeHome.delta"]')).toBeNull();
  });

  it("uses the 2025/26 rates on 5 April 2026 and the 2026/27 rates on 6 April", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
    const { unmount } = renderEffect(FACTS, 2400);
    expect(screen.getByText("As at tax year 2025/26")).toBeDefined();
    unmount();
    vi.setSystemTime(new Date("2026-04-06T12:00:00Z"));
    renderEffect(FACTS, 2400);
    expect(screen.getByText("As at tax year 2026/27")).toBeDefined();
  });
});
