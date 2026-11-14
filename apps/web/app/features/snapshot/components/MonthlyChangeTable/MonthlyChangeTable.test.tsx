import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlyChangeTable } from "./MonthlyChangeTable";

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
            effect: 550.44,
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
            effect: 0,
            carried: false,
            currentSource: "confirmed",
          },
        ]}
      />,
    );
    expect(screen.getByText("Calculated")).toBeDefined();
    // "Confirmed", not "No change": a confirmed figure can sit beside a non-zero change.
    expect(screen.getByText("Confirmed")).toBeDefined();
    expect(screen.queryByText("No change")).toBeNull();
  });

  it("shows each account's effect on net worth: a debt that falls is a positive effect", () => {
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
            effect: 500,
            carried: false,
          },
          {
            accountId: "c",
            name: "Current account",
            isLiability: false,
            previous: 2000,
            current: 2300,
            change: 300,
            effect: 300,
            carried: true,
          },
        ]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Effect on net worth" })).toBeDefined();
    expect(screen.queryByText("Debts show the amount owed.")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    const mortgage = screen.getByRole("rowheader", { name: "Mortgage (owed)" }).closest("tr");
    expect(mortgage?.textContent).toContain("£149,500");
    expect(mortgage?.textContent).toContain("+£500");
    expect(mortgage?.textContent).toContain("up £500");
    const current = screen.getByRole("rowheader", { name: "Current account" }).closest("tr");
    expect(current?.textContent).toContain("+£300");
    expect(current?.textContent).toContain("Carried forward");
  });
});
