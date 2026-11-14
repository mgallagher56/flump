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
    control: () => screen.getByRole("slider", { name: /Extra payment a month range slider/i }),
    value: "150",
    expected:
      /^Illustration: highest rate first, estimated debt-free date \w+ \d{4}, total interest £1,324\. Smallest balance first, estimated debt-free date \w+ \d{4}, total interest £1,324$/,
  },
  {
    name: "MortgageVsIsaCalculator",
    element: <MortgageVsIsaCalculator />,
    control: () => screen.getByLabelText("Mortgage balance range slider"),
    value: "300000",
    expected:
      /^Illustration: overpaying, estimated interest saved £38,670\. ISA, estimated balance £183,388\.$/,
  },
  {
    name: "OverdraftCostCalculator",
    element: <OverdraftCostCalculator />,
    control: () => screen.getByLabelText("Average amount overdrawn range slider"),
    value: "2000",
    expected: /^Illustration: estimated overdraft interest £798 a year$/,
  },
  {
    name: "Section24Calculator",
    element: <Section24Calculator />,
    control: () => screen.getByLabelText("Rental income a year, before costs range slider"),
    value: "25000",
    expected:
      /^Illustration: estimated tax on rental income £7,600 a year\. Estimated cash left £7,400 a year\.$/,
  },
  {
    name: "StudentLoanCalculator",
    element: <StudentLoanCalculator />,
    control: () => screen.getByLabelText("Yearly salary before tax range slider"),
    value: "50000",
    expected: /^Illustration: estimated repayment £155 a month, £1,855 a year$/,
  },
  {
    name: "TaxTrapCalculator",
    element: <TaxTrapCalculator />,
    control: () => screen.getByRole("slider", { name: /Pay before tax a year range slider/i }),
    value: "105000",
    expected:
      /An extra £10,000 a year into your pension would lower take-home by an estimated £[\d,]+/,
  },
  {
    name: "ZeroPercentCliffCalculator",
    element: <ZeroPercentCliffCalculator />,
    control: () => screen.getByLabelText("Balance on the 0% card range slider"),
    value: "4800",
    expected: /^Illustration: £267 a month pays off the balance before the 0% deal ends$/,
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
