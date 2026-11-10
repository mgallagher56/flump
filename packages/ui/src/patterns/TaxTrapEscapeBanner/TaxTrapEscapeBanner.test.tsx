import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaxTrapEscapeBanner } from "./TaxTrapEscapeBanner";

describe("TaxTrapEscapeBanner Pattern", () => {
  it("renders 60% tax trap active warning and relief metrics for £115k earner", () => {
    render(<TaxTrapEscapeBanner grossIncome={115000} />);
    expect(screen.getByText("UK £100k–£125k 60% Tax Trap Active")).toBeDefined();
    expect(screen.getByText("62% Marginal Tax")).toBeDefined();
    expect(screen.getByText("Annual Tax & NI Saved")).toBeDefined();
  });
});
