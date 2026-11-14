import {
  incomeScenarioFromFacts,
  type ProfileFacts,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import { formatMoney } from "@repo/ui";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PENSION_TAKE_HOME_COPY, PensionTakeHomeEffect } from "./PensionTakeHomeEffect";

const FACTS: ProfileFacts = {
  annualSalary: 60_000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: true,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("<PensionTakeHomeEffect />", () => {
  it("states the engine's take-home change for the extra monthly amount", () => {
    render(<PensionTakeHomeEffect extraMonthly={200} facts={FACTS} />);
    const expected = whatIfSacrificeChange(incomeScenarioFromFacts(FACTS).scenario, 2400);
    const sentence = document.querySelector('[data-figure="takeHome.delta"]');
    expect(sentence?.textContent).toContain(
      `lower take-home by an estimated ${formatMoney(-expected.deltaTakeHome, { fractionDigits: 0 }).text}`,
    );
    expect(sentence?.textContent).toContain(
      `${formatMoney(expected.deltaPensionGross, { fractionDigits: 0 }).text} would reach your pension`,
    );
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.methodSalarySacrifice)).toBeDefined();
  });

  it("uses net pay when the saved contribution is not salary sacrifice", () => {
    render(
      <PensionTakeHomeEffect extraMonthly={200} facts={{ ...FACTS, isSalarySacrifice: false }} />,
    );
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.methodNetPay)).toBeDefined();
  });

  it("asks for an extra amount when none is set", () => {
    render(<PensionTakeHomeEffect extraMonthly={0} facts={FACTS} />);
    expect(screen.getByText(PENSION_TAKE_HOME_COPY.noExtra)).toBeDefined();
    expect(document.querySelector('[data-figure="takeHome.delta"]')).toBeNull();
  });

  it("points to Profile when a needed fact is missing, with no figure", () => {
    render(<PensionTakeHomeEffect extraMonthly={200} facts={{ ...FACTS, employmentType: null }} />);
    expect(document.querySelector("[data-testid=pension-take-home-effect]")?.textContent).toContain(
      "Profile",
    );
    expect(document.querySelector('[data-figure="takeHome.delta"]')).toBeNull();
  });

  it("uses the 2025/26 rates on 5 April 2026 and the 2026/27 rates on 6 April", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
    const { unmount } = render(<PensionTakeHomeEffect extraMonthly={200} facts={FACTS} />);
    expect(screen.getByText("As at tax year 2025/26")).toBeDefined();
    unmount();
    vi.setSystemTime(new Date("2026-04-06T12:00:00Z"));
    render(<PensionTakeHomeEffect extraMonthly={200} facts={FACTS} />);
    expect(screen.getByText("As at tax year 2026/27")).toBeDefined();
  });
});
