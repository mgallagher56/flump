import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { PensionSummary, type PensionSummaryProps } from "./PensionSummary";

const props: PensionSummaryProps = {
  totalValue: 25000,
  potsCount: 2,
  hasSalary: true,
  monthlyEmployeeContrib: 188,
  monthlyEmployerContrib: 113,
  directMonthlyContrib: 50,
  employeePercent: 5,
  employerPercent: 3,
  netMonthlyCost: 135,
  taxReliefMonthly: 53,
  weightedReturnRate: 5.4,
};

describe("<PensionSummary />", () => {
  test("shows four KPIs with 'Total in your pots' as the single hero", () => {
    const { container, getByText } = customRender(<PensionSummary {...props} />);
    const heroes = container.querySelectorAll("[data-tone='hero']");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.textContent).toContain("Total in your pots");
    expect(heroes[0]?.textContent).toContain("£25,000");
    expect(heroes[0]?.textContent).toContain("Across 2 pension pots");
    for (const label of ["Going in each month", "Your cost after tax relief", "Assumed growth"]) {
      expect(getByText(label)).toBeDefined();
    }
    expect(container.textContent).toContain("£351");
    expect(container.textContent).toContain("£135");
    expect(container.textContent).toContain("5.4% a year");
  });

  test("no pots drops the hero and shows honest empty states, not zeros", () => {
    const { container, getByText } = customRender(
      <PensionSummary {...props} potsCount={0} totalValue={0} />,
    );
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    expect(getByText("No pots yet")).toBeDefined();
    expect(container.textContent).not.toContain("5.4%");
  });

  test("no salary never invents employee, employer or tax relief figures", () => {
    const { container } = customRender(
      <PensionSummary
        {...props}
        directMonthlyContrib={0}
        hasSalary={false}
        monthlyEmployeeContrib={0}
        monthlyEmployerContrib={0}
        netMonthlyCost={0}
        taxReliefMonthly={0}
      />,
    );
    expect(container.textContent).toContain(
      "Add your salary to include your own and your employer's contributions",
    );
    expect(container.textContent).toContain("Needs your salary and contribution rate");
    expect(container.textContent).not.toContain("£351");
    expect(container.textContent).not.toContain("£135");
  });

  test("a growth placeholder is labelled as one", () => {
    const { container } = customRender(
      <PensionSummary {...props} growthRateIsPlaceholder weightedReturnRate={5} />,
    );
    expect(container.textContent).toContain("A 5% placeholder");
  });

  test("keeps KPI values out of the heading outline", () => {
    const { queryAllByRole, queryAllByRole: status } = customRender(<PensionSummary {...props} />);
    expect(queryAllByRole("heading")).toHaveLength(0);
    expect(status("status")).toHaveLength(0);
  });
});
