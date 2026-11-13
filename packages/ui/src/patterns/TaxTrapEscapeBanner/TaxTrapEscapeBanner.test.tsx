import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaxTrapEscapeBanner } from "./TaxTrapEscapeBanner";

describe("TaxTrapEscapeBanner Pattern", () => {
  it("describes the £100,000 to £125,140 band and the modelled figures for a £115k income", () => {
    render(<TaxTrapEscapeBanner grossIncome={115000} />);
    expect(screen.getByText("Income in the £100,000 to £125,140 band")).toBeDefined();
    expect(screen.getByText("62% marginal rate in the band")).toBeDefined();
    expect(screen.getByText("Tax and NI difference a year")).toBeDefined();
  });

  it("offers no button that applies the modelled contribution (R5)", () => {
    render(<TaxTrapEscapeBanner grossIncome={115000} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
