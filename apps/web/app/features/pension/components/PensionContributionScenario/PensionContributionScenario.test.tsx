import type { ProfileFacts } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { useScenarioState } from "~/hooks/useScenarioState";
import {
  PENSION_ZONE_SHOW_LABEL,
  PENSION_ZONE_TITLE,
  PensionContributionScenario,
  type PensionContributionScenarioState,
  pensionZoneSummary,
} from "./PensionContributionScenario";

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

let current: PensionContributionScenarioState;
const Harness: FC<{ hasSalary?: boolean }> = ({ hasSalary = true }) => {
  current = useScenarioState({ contributionPercent: 5 });
  return (
    <PensionContributionScenario
      hasSalary={hasSalary}
      salary={hasSalary ? 60_000 : 0}
      savedEmployeePercent={5}
      scenario={current}
      takeHomeFacts={FACTS}
    />
  );
};

const zone = () => screen.getByRole("region", { name: PENSION_ZONE_TITLE });
const openZone = () =>
  fireEvent.click(screen.getByRole("button", { name: PENSION_ZONE_SHOW_LABEL }));

describe("<PensionContributionScenario />", () => {
  it("starts closed with the saved starting figures, then the last illustration once changed", () => {
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: PENSION_ZONE_SHOW_LABEL });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("slider")).toBeNull();
    // Saved: 5% of £60,000.
    expect(
      screen.getByText("Starts from your contribution of 5% of your £60,000 salary."),
    ).toBeTruthy();
    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText("Your contribution"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Hide what-if" }));
    expect(screen.getByText("Your illustration: a contribution of 8% instead of 5%.")).toBeTruthy();
  });

  it("words half percentages with one decimal place in the summary", () => {
    // 5.5% of £42,500: one decimal kept, whole pounds with a thousands comma.
    expect(pensionZoneSummary(42_500, 5.5, 5.5, false)).toBe(
      "Starts from your contribution of 5.5% of your £42,500 salary.",
    );
    expect(pensionZoneSummary(42_500, 5.5, 7, true)).toBe(
      "Your illustration: a contribution of 7% instead of 5.5%.",
    );
  });

  it("is one zone with one input and the take-home outcome, with no tabs or pension projection", () => {
    render(<Harness />);
    openZone();
    expect(within(zone()).getAllByRole("slider")).toHaveLength(1);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("No change")).toBeTruthy();
    expect(zone().textContent).not.toMatch(/Estimated pot|at retirement|income a month/i);
  });

  it("moving your contribution shows the take-home change and can be reset", () => {
    render(<Harness />);
    openZone();
    fireEvent.change(screen.getByLabelText("Your contribution"), { target: { value: "8" } });
    expect(current.values.contributionPercent).toBe(8);
    expect(screen.getByText("Edited. Not saved.")).toBeTruthy();
    expect(document.querySelector('[data-figure="takeHome.delta"]')?.textContent).toMatch(
      /^-£[\d,]+ a month$/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(current.values.contributionPercent).toBe(5);
  });

  it("without a saved salary, asks for it instead of showing a figure", () => {
    render(<Harness hasSalary={false} />);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(zone().textContent).toContain("to see the effect of a change on your take-home pay.");
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe(
      "/app/profile#settings-age-and-pay",
    );
  });
});
