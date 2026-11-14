import {
  incomeScenarioFromFacts,
  type ProfileFacts,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import { formatMoney } from "@repo/ui";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.methodSalarySacrifice)).toBeDefined();
  });

  it("uses net pay when the saved contribution is not salary sacrifice", () => {
    renderEffect({ ...FACTS, isSalarySacrifice: false }, 2400);
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.methodNetPay)).toBeDefined();
  });

  it("asks for a change when the contribution matches the saved figure", () => {
    renderEffect(FACTS, 0);
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.noChange)).toBeDefined();
    expect(document.querySelector('[data-figure="takeHome.delta"]')).toBeNull();
  });

  it("points to Profile when a needed fact is missing, with no figure", () => {
    renderEffect({ ...FACTS, employmentType: null }, 2400);
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/app/profile");
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
