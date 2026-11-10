import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AllowanceProgressPill } from "./AllowanceProgressPill";

describe("AllowanceProgressPill Pattern", () => {
  it("renders ISA allowance with limit and contributed percentage", () => {
    render(<AllowanceProgressPill currentAmount={10000} type="isa" />);
    expect(screen.getByText("UK ISA Annual Allowance")).toBeDefined();
    expect(screen.getByText("£20,000 / Tax Year")).toBeDefined();
    expect(screen.getByText("£10,000 remaining tax-free capacity")).toBeDefined();
  });
});
