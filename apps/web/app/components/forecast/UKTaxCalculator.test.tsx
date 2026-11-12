import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import UKTaxCalculator, { calculateUKTax } from "./UKTaxCalculator";

// Mock Recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 400, height: 400 }}>{children}</div>
    ),
  };
});

describe("<UKTaxCalculator /> without a salary", () => {
  test.each([
    ["undefined", undefined],
    ["null", null],
    ["zero", 0],
  ])(
    "renders 'Not set' and never an invented salary when initialSalary is %s",
    (_label, salary) => {
      const { container, getAllByText, getAllByRole, getByLabelText } = customRender(
        <UKTaxCalculator initialSalary={salary} onApplyIncrease={vi.fn()} />,
      );
      expect(getAllByText("Not set").length).toBeGreaterThan(0);
      expect(getByLabelText("Gross salary").getAttribute("aria-valuetext")).toBe("Not set");
      expect(getAllByRole("link", { name: "Add salary" })[0].getAttribute("href")).toBe(
        "/app/profile",
      );
      expect(container.textContent).not.toContain("45,000");
      expect(container.textContent).not.toContain("Monthly Take-Home Pay £");
    },
  );
});

describe("<UKTaxCalculator /> editing the salary", () => {
  test("clearing the input while typing keeps the results mounted and the field usable", () => {
    const { container, getByRole } = customRender(
      <UKTaxCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(getByRole("figure", { name: "Salary allocation" })).toBeDefined();

    fireEvent.change(input, { target: { value: "60000" } });
    expect(input.value).toBe("60000");
    expect(getByRole("figure", { name: "Salary allocation" }).textContent).toContain("£60,000");
  });

  test("typing a salary into an unset calculator reveals the results", () => {
    const { container, queryByRole } = customRender(<UKTaxCalculator onApplyIncrease={vi.fn()} />);
    expect(queryByRole("figure", { name: "Salary allocation" })).toBeNull();
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "50000" } });
    expect(queryByRole("figure", { name: "Salary allocation" })).not.toBeNull();
  });
});

describe("<UKTaxCalculator />", () => {
  test("renders correctly with gross salary and elements", () => {
    const { container, getAllByText } = customRender(
      <UKTaxCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );
    expect(container).toBeDefined();
    // Gross £45,000 is rendered multiple times (inputs and breakdown)
    expect(getAllByText("£45,000").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Salary Sacrifice (saves NI)");
    expect(container.textContent).toContain("Pass on Employer NI");
  });
  describe("calculateUKTax logic helper", () => {
    test("calculates correct net pay for £45,000 with 5% pension (sacrifice)", () => {
      // Gross: 45,000
      // Pension (5%): 2,250. Adjusted Gross: 42,750.
      // Personal Allowance: 12,570. Taxable Income: 30,180.
      // Income Tax (20% of 30,180): 6,036.
      // NI (8% of 42,750 - 12,570): 2,414 (rounded).
      // Student Loan: 0.
      // Expected Net: 45,000 - 2,250 - 6,036 - 2,414 = 34,300.
      const result = calculateUKTax(45000, 5, "none");
      expect(result.pension).toBe(2250);
      expect(result.incomeTax).toBe(6036);
      expect(result.ni).toBe(2414);
      expect(result.netPay).toBe(34300);
    });
    test("tapers personal allowance above £100,000", () => {
      // Gross: 120,000, Pension: 0%. Adjusted Gross: 120,000.
      // Over 100k by 20,000. Reduction: 10,000.
      // Personal Allowance: 12,570 - 10,000 = 2,570.
      const result = calculateUKTax(120000, 0, "none");
      expect(result.personalAllowance).toBe(2570);
    });

    test("calculates student loan plan 1 correctly", () => {
      // Gross: 30,000, Pension: 0%. Adjusted Gross: 30,000.
      // Plan 1 Threshold: 26,900.
      // Excess: 3,100. Repayment (9%): 279.00.
      const result = calculateUKTax(30000, 0, "plan1");
      expect(result.studentLoan).toBeCloseTo(279.0, 1);
    });

    test("calculates employer NI savings when employer NI pass-through is enabled", () => {
      // £45,000 gross with 5% pension = £2,250 sacrifice
      // In 2026/27, employer NI rate is 15.0% on earnings above £5,000.
      // £2,250 * 0.15 = £337.50 (pence kept, D5-a)
      const result = calculateUKTax(45000, 5, "none", "2026/27", true, true);
      expect(result.employerNiSaving).toBe(337.5);
      expect(result.totalPension).toBe(2250 + 337.5);
    });
  });
});

describe("<UKTaxCalculator /> chart accessibility", () => {
  test("exposes the allocation as a named figure and a legend with amounts", () => {
    const { getByRole } = customRender(
      <UKTaxCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );

    const figure = getByRole("figure", { name: "Salary allocation" });
    expect(figure.textContent).toContain("Where your £45,000 gross salary goes");
    expect(figure.textContent).toMatch(/Take-Home Pay £[\d,]+/);
  });
});
