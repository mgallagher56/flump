import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AllowanceProgressPill } from "./AllowanceProgressPill";

describe("AllowanceProgressPill Pattern", () => {
  it("renders ISA allowance with limit and contributed percentage", () => {
    render(<AllowanceProgressPill currentAmount={10000} type="isa" />);
    expect(screen.getByText("ISA allowance")).toBeDefined();
    expect(screen.getByText("£20,000 a tax year")).toBeDefined();
    expect(screen.getByText("£10,000 of this tax year's allowance is unused")).toBeDefined();
  });
});
