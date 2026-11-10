import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebtToWealthChart } from "./DebtToWealthChart";

describe("DebtToWealthChart Pattern", () => {
  it("renders crossover bridge header and milestone metrics", () => {
    render(<DebtToWealthChart />);
    expect(screen.getByText("The Debt-to-Wealth Crossover Bridge")).toBeDefined();
    expect(screen.getByText("Debt-Free Milestone")).toBeDefined();
    expect(screen.getByText("+£21,500")).toBeDefined();
  });
});
