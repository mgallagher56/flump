import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DebtSnowballCalculator,
  MortgageVsIsaCalculator,
  OverdraftCostCalculator,
  Section24Calculator,
  StudentLoanCalculator,
  TaxTrapCalculator,
  ZeroPercentCliffCalculator,
} from "./index";

const CASES: {
  name: string;
  element: ReactElement;
  control: () => HTMLElement;
  value: string;
  expected: RegExp;
}[] = [
  {
    name: "DebtSnowballCalculator",
    element: <DebtSnowballCalculator />,
    control: () => screen.getByRole("slider", { name: /Monthly overpayment surplus slider/i }),
    value: "150",
    expected: /^Debt-free by .+, total interest £[\d,]+$/,
  },
  {
    name: "MortgageVsIsaCalculator",
    element: <MortgageVsIsaCalculator />,
    control: () => screen.getByLabelText("Mortgage balance slider"),
    value: "300000",
    expected: /Overpaying saves £[\d,]+ interest; the ISA would grow to £[\d,]+/,
  },
  {
    name: "OverdraftCostCalculator",
    element: <OverdraftCostCalculator />,
    control: () => screen.getByLabelText("Overdraft Balance"),
    value: "2000",
    expected: /Overdraft costs £798 a year/,
  },
  {
    name: "Section24Calculator",
    element: <Section24Calculator />,
    control: () => screen.getByLabelText("Gross annual rental income slider"),
    value: "25000",
    expected: /Tax due £[\d,]+ a year, leaving £[\d,]+ cash in pocket/,
  },
  {
    name: "StudentLoanCalculator",
    element: <StudentLoanCalculator />,
    control: () => screen.getByLabelText("Annual Salary"),
    value: "50000",
    expected: /Repayment £[\d,]+ a month, £[\d,]+ a year/,
  },
  {
    name: "TaxTrapCalculator",
    element: <TaxTrapCalculator />,
    control: () => screen.getByRole("slider", { name: /Total Gross UK Income/i }),
    value: "105000",
    expected: /Tax and NI saved £[\d,]+/,
  },
  {
    name: "ZeroPercentCliffCalculator",
    element: <ZeroPercentCliffCalculator />,
    control: () => screen.getByLabelText("0% card balance"),
    value: "4800",
    expected: /Pay £267 a month to clear the balance/,
  },
];

describe("calculator headline live regions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(CASES)(
    "$name announces its headline outcome after 1000ms",
    ({ element, control, value, expected }) => {
      render(element);
      const region = screen.getByRole("status");
      expect(region.textContent).toBe("");

      fireEvent.change(control(), { target: { value } });
      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(region.textContent).toBe("");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(region.textContent).toMatch(expected);
    },
  );
});
