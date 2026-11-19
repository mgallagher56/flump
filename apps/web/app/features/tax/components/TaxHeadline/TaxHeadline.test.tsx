import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { taxRecordsFixture, taxResultFixture } from "../../__fixtures__/taxRecords";
import {
  allowanceLine,
  billDueDate,
  nonPayeCosts,
  nonPayeIncome,
  TaxHeadline,
} from "./TaxHeadline";

describe("TaxHeadline", () => {
  it("puts the estimated bill in the hero, labelled inside it, and the recorded income in the first KPI", () => {
    const { container } = render(
      <TaxHeadline records={taxRecordsFixture} result={taxResultFixture} taxYear="2026/27" />,
    );
    const heroes = container.querySelectorAll('[data-tone="hero"]');
    expect(heroes).toHaveLength(1);
    expect(heroes[0].textContent).toContain("Estimated bill");
    expect(heroes[0].textContent).not.toContain("Income outside PAYE");
    // The year is in the year control, not repeated in the hero.
    expect(heroes[0].textContent).not.toContain("2026/27");
    expect(heroes[0].querySelector("[data-estimate-label]")?.textContent).toBe(
      "Unverified estimate",
    );
    expect(container.querySelectorAll("[data-estimate-label]")).toHaveLength(1);
    expect(screen.getByText("Income outside PAYE")).toBeDefined();
    expect(screen.getByText("Bill due")).toBeDefined();
    expect(screen.getByText("Income after expenses")).toBeDefined();
    expect(container.querySelectorAll("[data-kpi-value]").length).toBe(3);
    expect(screen.getByText("31 Jan 2028")).toBeDefined();
    expect(container.textContent).not.toMatch(/£[\d,]+\.\d{2}/);
  });

  it("asks for income and shows no £0 when the year has none", () => {
    const { container } = render(
      <TaxHeadline
        emptyAction={<button type="button">Add income</button>}
        records={[]}
        result={taxResultFixture}
        taxYear="2026/27"
      />,
    );
    expect(container.textContent).not.toContain("£0");
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Add income" })).toBeDefined();
  });

  it("reconciles: income before costs in the first card, income less costs beside it", () => {
    const { container } = render(
      <TaxHeadline records={taxRecordsFixture} result={taxResultFixture} taxYear="2026/27" />,
    );
    const first = container.querySelector("[data-kpi-value]")?.textContent ?? "";
    const before = Number(/£([\d,]+)/.exec(first)?.[1]?.replace(/,/g, ""));
    const after =
      nonPayeIncome(taxRecordsFixture, "2026/27") - nonPayeCosts(taxRecordsFixture, "2026/27");
    expect(before).toBe(nonPayeIncome(taxRecordsFixture, "2026/27"));
    expect(screen.getByText("Your income less the expenses you recorded")).toBeDefined();
    expect(container.textContent).toContain(`£${Math.round(after).toLocaleString("en-GB")}`);
  });

  it("says when no costs are recorded and offers to add one", () => {
    const incomeOnly = taxRecordsFixture.filter((r) => r.type === "income");
    const onAddExpense = vi.fn();
    render(
      <TaxHeadline
        onAddExpense={onAddExpense}
        records={incomeOnly}
        result={taxResultFixture}
        taxYear="2026/27"
      />,
    );
    expect(screen.getByText("No expenses recorded")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Add an expense" }));
    expect(onAddExpense).toHaveBeenCalledTimes(1);
  });

  it("says when the January payment includes a first payment on account", () => {
    const withPayments = {
      ...taxResultFixture,
      payments: { ...taxResultFixture.payments, paymentsOnAccountDue: true },
    };
    const { rerender } = render(
      <TaxHeadline records={taxRecordsFixture} result={withPayments} taxYear="2026/27" />,
    );
    expect(screen.getByText("This year's bill and a first payment on account")).toBeDefined();
    const without = {
      ...taxResultFixture,
      payments: { ...taxResultFixture.payments, paymentsOnAccountDue: false },
    };
    rerender(<TaxHeadline records={taxRecordsFixture} result={without} taxYear="2026/27" />);
    expect(screen.queryByText("This year's bill and a first payment on account")).toBeNull();
    expect(screen.getByText("Paid to HMRC")).toBeDefined();
  });

  it("dates the bill to 31 January after the tax year ends", () => {
    expect(billDueDate("2025/26").toISOString().slice(0, 10)).toBe("2027-01-31");
  });

  it("says when the engine used an allowance in place of recorded costs, from its flags only", () => {
    expect(allowanceLine({ tradingAllowanceUsed: 0, propertyAllowanceUsed: 0 })).toBeNull();
    expect(allowanceLine(undefined)).toBeNull();
    expect(allowanceLine({ tradingAllowanceUsed: 1000, propertyAllowanceUsed: 0 })).toBe(
      "The estimate uses the trading allowance, which is more than the expenses you recorded.",
    );
    expect(allowanceLine({ tradingAllowanceUsed: 0, propertyAllowanceUsed: 1000 })).toContain(
      "uses the property allowance",
    );
    expect(allowanceLine({ tradingAllowanceUsed: 1000, propertyAllowanceUsed: 600 })).toContain(
      "uses the trading and property allowances",
    );
    render(
      <TaxHeadline
        records={taxRecordsFixture}
        result={{ ...taxResultFixture, tradingAllowanceUsed: 1000 }}
        taxYear="2026/27"
      />,
    );
    // The allowance changes the bill, so the line is the hero's sub-line, in place of its default.
    const billHero = screen.getByRole("group", { name: "Estimated bill" });
    expect(billHero.textContent).toContain("uses the trading allowance");
    const afterCard = screen
      .getByText("Income after expenses")
      .closest("[data-kpi-eyebrow]")?.parentElement;
    expect(afterCard?.textContent).not.toContain("allowance");
    expect(screen.queryByText("Income Tax and National Insurance on this income")).toBeNull();
    // The after-costs card keeps its own subtext.
    expect(screen.getByText("Your income less the expenses you recorded")).toBeDefined();
  });

  it("keeps the bill's default sub-line when no allowance was used", () => {
    render(<TaxHeadline records={taxRecordsFixture} result={taxResultFixture} taxYear="2026/27" />);
    expect(screen.getByText("Income Tax and National Insurance on this income")).toBeDefined();
  });
});

describe("nonPayeCosts and finance costs brought forward", () => {
  it("leaves out an amount brought forward from earlier years: it is not a cost of this year", () => {
    const base = {
      id: "r",
      userId: "u",
      source: "rental" as const,
      type: "expense" as const,
      name: "x",
      frequency: "annual" as const,
      date: "2026-06-06",
      endDate: null,
      notes: null,
      receiptFilename: null,
      receiptMimeType: null,
      createdAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-06T00:00:00.000Z",
    };
    const records = [
      { ...base, id: "a", category: "repairs_maintenance", amount: 500 },
      { ...base, id: "b", category: "finance_costs_brought_forward", amount: 1570 },
    ];
    // Only the 500 of repairs is a cost recorded for 2026/27.
    expect(nonPayeCosts(records, "2026/27")).toBe(500);
  });
});
