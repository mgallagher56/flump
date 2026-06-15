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

describe("<UKTaxCalculator />", () => {
  test("renders correctly with gross salary and elements", () => {
    const { container, getAllByText } = customRender(<UKTaxCalculator onApplyIncrease={vi.fn()} />);
    expect(container).toBeDefined();
    // Default gross £45,000 is rendered multiple times (inputs and breakdown)
    expect(getAllByText("£45,000").length).toBeGreaterThan(0);
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
  });
});
