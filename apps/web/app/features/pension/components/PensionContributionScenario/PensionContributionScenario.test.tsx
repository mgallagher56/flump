import type { ProfileFacts } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { useScenarioState } from "~/hooks/useScenarioState";
import {
  PENSION_ZONE_TITLE,
  PensionContributionScenario,
  type PensionContributionScenarioState,
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

describe("<PensionContributionScenario />", () => {
  it("is one zone with one input and the take-home outcome, with no tabs or pension projection", () => {
    render(<Harness />);
    expect(within(zone()).getAllByRole("slider")).toHaveLength(1);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("No change")).toBeTruthy();
    expect(zone().textContent).not.toMatch(/Estimated pot|at retirement|income a month/i);
  });

  it("moving your contribution shows the take-home change and can be reset", () => {
    render(<Harness />);
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
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/app/profile");
  });
});
