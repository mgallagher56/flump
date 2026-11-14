import { expectPageRules } from "@repo/ui/testing";
import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { PensionSummary, type PensionSummaryProps } from "./PensionSummary";

vi.mock("react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

const props: PensionSummaryProps = {
  totalValue: 96000,
  potsCount: 1,
  estimatedMonthlyIncome: 1240,
  monthlyTotal: 532,
  retirementAge: 67,
  onAddPot: () => {},
};

describe("<PensionSummary />", () => {
  test("the saved pot total is the one hero and the estimate is the first KPI", () => {
    const { container, getAllByRole } = customRender(<PensionSummary {...props} />);
    const heroes = container.querySelectorAll("[data-tone='hero']");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.textContent).toContain("Total in your pots");
    expect(heroes[0]?.textContent).toContain("£96,000");
    expect(heroes[0]?.textContent).not.toMatch(/estimate/i);
    const labels = Array.from(container.querySelectorAll("[data-density='compact'] > *")).map(
      (card) => card.textContent ?? "",
    );
    expect(labels[0]).toContain("Estimated income at retirement");
    expect(labels[0]).toContain("Estimate");
    expect(labels[1]).toContain("Going in each month");
    expect(labels[2]).toContain("Retirement age");
    expect(getAllByRole("group").length).toBeGreaterThan(0);
    // Hero plus three KPIs: four figures, none in a caption.
    expectPageRules(container, { maxFigures: 4 });
  });

  test("captions carry no figures", () => {
    const { getByText } = customRender(<PensionSummary {...props} />);
    for (const caption of ["A month, in today's money", "Your State Pension age"]) {
      expect(getByText(caption).textContent).not.toMatch(/£|%|\d/);
    }
  });

  test("unknown values read Not set with one action, never zero", () => {
    const onAddPot = vi.fn();
    const { container, getByRole, queryByText } = customRender(
      <PensionSummary
        {...props}
        onAddPot={onAddPot}
        estimateMissing={{ label: "Add a growth rate", to: "/app/pension" }}
        estimatedMonthlyIncome={null}
        potsCount={0}
        totalValue={0}
      />,
    );
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    expect(queryByText("£0")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Add pension pot" }));
    expect(onAddPot).toHaveBeenCalled();
    expect(getByRole("link", { name: "Add a growth rate" })).toBeDefined();
  });

  test("assumed rates are named in the captions, with no figure", () => {
    const { getByText } = customRender(<PensionSummary {...props} ratesAssumed />);
    expect(getByText("Assumed rates. Edit to match your payslip")).toBeDefined();
    expect(getByText("A month, in today's money, on assumed rates")).toBeDefined();
  });

  test("a mostly unknown strip becomes one prompt", () => {
    const { getByText, queryByText } = customRender(
      <PensionSummary {...props} estimatedMonthlyIncome={null} retirementAge={null} />,
    );
    expect(getByText(/Add your year of birth and salary/)).toBeDefined();
    expect(queryByText("Going in each month")).toBeNull();
  });
});
