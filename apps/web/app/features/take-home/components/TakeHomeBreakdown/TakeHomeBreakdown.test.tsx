import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { calculateUKTax } from "../../calculateUKTax";
import { TakeHomeBreakdown } from "./TakeHomeBreakdown";

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: unknown }) => (
      <div style={{ width: 400, height: 400 }}>{children as never}</div>
    ),
  };
});

const renderBreakdown = (gross: number, plan = "none", sacrifice = true, employerNi = false) =>
  render(
    <TakeHomeBreakdown
      grossSalary={gross}
      isSalarySacrifice={sacrifice}
      results={calculateUKTax(gross, 5, plan, "2026/27", sacrifice, employerNi)}
    />,
  );

describe("<TakeHomeBreakdown />", () => {
  it("names the donut and gives each slice an amount and a share", () => {
    renderBreakdown(45000);
    const figure = screen.getByRole("figure", { name: "Salary allocation" });
    expect(figure.textContent).toContain("Where your £45,000 gross salary goes");
    expect(figure.textContent).toMatch(/Take-home pay £[\d,]+/);
  });

  it("lists the deductions in a table with column headers", () => {
    renderBreakdown(45000, "plan1");
    const table = screen.getByRole("table", { name: "Salary deductions breakdown" });
    expect(within(table).getByRole("columnheader", { name: "A year" })).toBeDefined();
    for (const row of ["Gross income", "Income tax", "National Insurance", "Student loan"]) {
      expect(within(table).getByRole("cell", { name: row })).toBeDefined();
    }
    expect(within(table).getByRole("cell", { name: "Estimated take-home" })).toBeDefined();
  });

  it("adds the employer NI row only when it is passed on", () => {
    const { unmount } = renderBreakdown(45000);
    expect(screen.queryByText("Employer NI paid into your pension")).toBeNull();
    unmount();
    renderBreakdown(45000, "none", true, true);
    expect(screen.getByText("Employer NI paid into your pension")).toBeDefined();
  });
});
