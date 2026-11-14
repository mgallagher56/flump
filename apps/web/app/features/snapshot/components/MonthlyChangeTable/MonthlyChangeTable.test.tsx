import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MonthChangeRow } from "../../snapshotModel";
import { MonthlyChangeTable } from "./MonthlyChangeTable";

const monthRows = (n: number): MonthChangeRow[] =>
  Array.from({ length: n }, (_, i) => ({
    month: `2026-${String(12 - i).padStart(2, "0")}`,
    previousMonth: `2026-${String(11 - i).padStart(2, "0")}`,
    netWorth: 1000 + i,
    change: i % 2 === 0 ? 100 : -100,
    allCarried: i === 1,
    someCarried: i === 1,
    addedAccounts: i === 2 ? 1 : 0,
  }));

describe("MonthlyChangeTable", () => {
  it("labels a calculated or confirmed figure wherever it appears (R2-5)", () => {
    render(
      <MonthlyChangeTable
        month="2026-11"
        previousMonth="2026-10"
        rows={[
          {
            accountId: "m",
            name: "Mortgage",
            isLiability: true,
            previous: 186550,
            current: 185999.56,
            change: -550.44,
            carried: false,
            currentSource: "calculated",
          },
          {
            accountId: "p",
            name: "Pension",
            isLiability: false,
            previous: 9000,
            current: 9000,
            change: 0,
            carried: false,
            currentSource: "confirmed",
          },
        ]}
        variant="accounts"
      />,
    );
    expect(screen.getByText("Calculated")).toBeDefined();
    expect(screen.getByText("No change")).toBeDefined();
  });

  it("shows per-account changes with debts as the amount owed", () => {
    render(
      <MonthlyChangeTable
        month="2026-10"
        previousMonth="2026-09"
        rows={[
          {
            accountId: "m",
            name: "Mortgage",
            isLiability: true,
            previous: 150000,
            current: 149500,
            change: -500,
            carried: false,
          },
          {
            accountId: "c",
            name: "Current account",
            isLiability: false,
            previous: 2000,
            current: 2300,
            change: 300,
            carried: true,
          },
        ]}
        variant="accounts"
      />,
    );
    expect(screen.getByText("Debts show the amount owed.")).toBeDefined();
    const mortgage = screen.getByRole("rowheader", { name: "Mortgage (owed)" }).closest("tr");
    expect(mortgage?.textContent).toContain("−£500");
    expect(mortgage?.textContent).toContain("down £500");
    const current = screen.getByRole("rowheader", { name: "Current account" }).closest("tr");
    expect(current?.textContent).toContain("+£300");
    expect(current?.textContent).toContain("Carried forward");
  });

  it("lists every month with its net worth and change, as a plain table with no heading", () => {
    render(<MonthlyChangeTable rows={monthRows(10)} variant="months" />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("table", { name: "Net worth change by month" })).toBeDefined();
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("Includes 1 new account")).toBeDefined();
    expect(screen.getByText("Carried forward")).toBeDefined();
  });
});
