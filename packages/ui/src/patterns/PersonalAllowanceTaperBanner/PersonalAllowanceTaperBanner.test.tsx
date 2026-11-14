import { calculateUKEWNITakeHome, resolveUkTaxYear } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonalAllowanceTaperBanner } from "./PersonalAllowanceTaperBanner";

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

function taxAndNi(gross: number) {
  const r = calculateUKEWNITakeHome(gross, "employed", 0, true, resolveUkTaxYear());
  return r.incomeTax + r.ni;
}

describe("PersonalAllowanceTaperBanner", () => {
  it("describes the taper band for a £115k income", () => {
    render(<PersonalAllowanceTaperBanner grossIncome={115000} />);
    expect(screen.getByText("Income in the £100,000 to £125,140 band")).toBeDefined();
    expect(screen.getByText("62% marginal rate in the band")).toBeDefined();
    expect(screen.getByText("Tax and NI difference a year")).toBeDefined();
  });

  it("uses engine figures, not 62% of the whole sacrifice, when income is above the band", () => {
    render(<PersonalAllowanceTaperBanner grossIncome={140000} />);
    fireEvent.change(screen.getByLabelText("Pension sacrifice amount"), {
      target: { value: "40000" },
    });
    const expected = taxAndNi(140000) - taxAndNi(100000);
    expect(screen.getByText(`${gbp(expected)} / yr`)).toBeDefined();
    expect(Math.round(expected)).not.toBe(Math.round(40000 * 0.62));
  });

  it("offers no button that applies the modelled contribution (R5)", () => {
    render(<PersonalAllowanceTaperBanner grossIncome={115000} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
