import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebtToWealthChart } from "./DebtToWealthChart";

describe("DebtToWealthChart Pattern", () => {
  it("renders crossover bridge header and milestone metrics", () => {
    render(<DebtToWealthChart />);
    expect(screen.getByText("Example: after the debts are paid off")).toBeDefined();
    expect(screen.getByText("Debt-free date")).toBeDefined();
    expect(screen.getByText("+£21,500")).toBeDefined();
  });
});
