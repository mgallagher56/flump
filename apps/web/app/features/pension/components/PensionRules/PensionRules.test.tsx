import { getUkTaxYearRules, resolveUkTaxYear } from "@flump/finance-engine";
import { findFigures } from "@repo/ui/testing";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PensionRules, type PensionRulesProps } from "./PensionRules";

const props: PensionRulesProps = {
  annualPaidIn: 6_380,
  methodSet: true,
  isSalarySacrifice: false,
  passEmployerNi: false,
};

const open = () => {
  fireEvent.click(screen.getByRole("button", { name: "UK pension rules" }));
  return screen.getByTestId("pension-rules");
};

describe("<PensionRules />", () => {
  it("is closed by default, so none of its figures show", () => {
    render(<PensionRules {...props} />);
    expect(screen.getByRole("button", { name: "UK pension rules" })).toBeDefined();
    expect(screen.queryByTestId("pension-rules")).toBeNull();
  });

  it("holds saved facts and UK rules only, with no projection", () => {
    render(<PensionRules {...props} />);
    const list = open();
    const rules = getUkTaxYearRules(resolveUkTaxYear());
    const gbp = (n: number) =>
      `£${n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`;
    expect(list.textContent).toContain("At your saved figures, £6,380 a year is paid in.");
    expect(list.textContent).toContain(
      `The standard annual allowance is ${gbp(rules.pensionAnnualAllowance)} a year.`,
    );
    // The figure comes from the engine's tax-year rules, not a web constant.
    expect(rules.pensionLumpSumAllowance).toBe(268_275);
    expect(list.textContent).toContain(
      `The tax-free lump sum allowance is ${gbp(rules.pensionLumpSumAllowance ?? 0)}.`,
    );
    expect(list.textContent).not.toContain("not updated each tax year");
    expect(list.textContent).toContain(
      `The full new State Pension is ${gbp(rules.statePension.fullNewAnnual)} a year.`,
    );
    expect(list.textContent).toContain("Not paid by salary sacrifice, from your details.");
    expect(list.textContent).not.toMatch(/growth|inflation|4%|estimate|only when you include/i);
  });

  it("leaves out the paid-in line when nothing is known, and names an unset method", () => {
    render(<PensionRules {...props} annualPaidIn={null} methodSet={false} />);
    const list = open();
    expect(list.textContent).not.toContain("is paid in");
    expect(list.textContent).toContain("Contribution method: not set in your details.");
  });

  it("keeps to one figure per sentence", () => {
    render(<PensionRules {...props} isSalarySacrifice passEmployerNi />);
    const list = open();
    for (const item of Array.from(list.querySelectorAll("li"))) {
      for (const sentence of (item.textContent ?? "").split(/(?<=\.)\s+/)) {
        const el = document.createElement("p");
        el.textContent = sentence;
        expect(findFigures(el).length, sentence).toBeLessThanOrEqual(1);
      }
    }
  });
});
