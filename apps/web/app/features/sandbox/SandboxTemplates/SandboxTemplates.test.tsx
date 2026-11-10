import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SandboxTemplates } from "./SandboxTemplates";

describe("SandboxTemplates", () => {
  it("renders Stage 1 by default", () => {
    render(<SandboxTemplates stage={1} />);
    expect(screen.getByText("Stage 1: Stabilise & Clear")).toBeDefined();
    expect(screen.getByText("Total Debt")).toBeDefined();
  });

  it("renders Stage 2 Crossover view", () => {
    render(<SandboxTemplates stage={2} />);
    expect(screen.getByText("Stage 2: Crossover & Accumulate")).toBeDefined();
    expect(screen.getByText("Stocks & Shares ISA")).toBeDefined();
  });

  it("renders Stage 3 Tax Trap view", () => {
    render(<SandboxTemplates stage={3} />);
    expect(screen.getByText("Stage 3: Tax Trap Escape & Wealth Acceleration")).toBeDefined();
  });
});
