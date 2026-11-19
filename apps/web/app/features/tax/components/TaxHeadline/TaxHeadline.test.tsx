import {
  calculateEstimatedTax,
  calculateUKTax,
  estimateInputsFor,
  type TaxRecord,
} from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { taxRecordsFixture, taxResultFixture } from "../../__fixtures__/taxRecords";
import { allowanceLine, billDueDate, TaxHeadline } from "./TaxHeadline";

describe("TaxHeadline", () => {
  it("puts the estimated bill in the hero, labelled inside it, and the recorded income in the first KPI", () => {
    const { container } = render(<TaxHeadline result={taxResultFixture} taxYear="2026/27" />);
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
        result={undefined}
        taxYear="2026/27"
      />,
    );
    expect(container.textContent).not.toContain("£0");
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Add income" })).toBeDefined();
  });

  it("reconciles: the engine's income before costs in the first card, income less costs beside it", () => {
    const { container } = render(<TaxHeadline result={taxResultFixture} taxYear="2026/27" />);
    const values = [...container.querySelectorAll("[data-kpi-value]")].map((n) => n.textContent);
    // The fixture at a 50% share (calculateUKTax's share argument): rent 2,400 a year at half is
    // 1,200, plus self-employed income; the engine's own totals, never a sum of the records.
    const income =
      taxResultFixture.rentalIncomeGrossShare +
      taxResultFixture.seIncomeGross +
      taxResultFixture.savingsInterestGross +
      taxResultFixture.dividendIncomeGross;
    expect(values[0]).toContain(`£${Math.round(income).toLocaleString("en-GB")}`);
    expect(screen.getByText("Your income less the expenses you recorded")).toBeDefined();
  });

  it("reads rent at the person's share and leaves ISA interest out (SA-9)", () => {
    // Joint rental property at 50%, rent 12,000, repairs 2,000, ISA interest 300, salary 30,000.
    // Income outside PAYE: rent 12,000 x 50% = 6,000; ISA interest is tax-free, so 0. 6,000.
    // After expenses: repairs 2,000 x 50% = 1,000; 6,000 - 1,000 = 5,000.
    // The old local sums gave 12,000 + 300 = 12,300 and 12,300 - 2,000 = 10,300.
    const rec = (id: string, over: Partial<TaxRecord>): TaxRecord => ({
      id,
      type: "income",
      source: "rental",
      category: "rental_income",
      name: id,
      amount: 0,
      frequency: "annual",
      date: "2026-06-06",
      endDate: null,
      notes: null,
      receiptFilename: null,
      receiptMimeType: null,
      receiptData: null,
      userId: "u",
      createdAt: "2026-04-06T00:00:00.000Z",
      updatedAt: "2026-04-06T00:00:00.000Z",
      ...over,
    });
    const records = [
      rec("rent", { amount: 12000 }),
      rec("repairs", { type: "expense", category: "repairs_maintenance", amount: 2000 }),
      rec("isa", { source: "savings", category: "isa_interest", amount: 300 }),
    ];
    const accounts = [
      {
        id: "p1",
        type: "Property",
        accountSubtype: "rental",
        ownership: "joint",
        sharePercent: 50,
      },
    ];
    const inputs = estimateInputsFor(
      { employmentType: "employed", annualSalary: 30000, accounts },
      records,
      "2026/27",
    );
    if (inputs.status !== "known") throw new Error("expected a known estimate");
    const { container } = render(
      <TaxHeadline result={calculateEstimatedTax(inputs)} taxYear="2026/27" />,
    );
    const values = [...container.querySelectorAll("[data-kpi-value]")].map((n) => n.textContent);
    expect(values[0]).toContain("£6,000");
    expect(values[1]).toContain("£5,000");
  });

  it("says when no costs are recorded and offers to add one", () => {
    const incomeOnly = taxRecordsFixture.filter((r) => r.type === "income");
    const onAddExpense = vi.fn();
    render(
      <TaxHeadline
        onAddExpense={onAddExpense}
        result={calculateUKTax("2026/27", incomeOnly, 52000, 50)}
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
    const { rerender } = render(<TaxHeadline result={withPayments} taxYear="2026/27" />);
    expect(screen.getByText("This year's bill and a first payment on account")).toBeDefined();
    const without = {
      ...taxResultFixture,
      payments: { ...taxResultFixture.payments, paymentsOnAccountDue: false },
    };
    rerender(<TaxHeadline result={without} taxYear="2026/27" />);
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
    render(<TaxHeadline result={taxResultFixture} taxYear="2026/27" />);
    expect(screen.getByText("Income Tax and National Insurance on this income")).toBeDefined();
  });
});

describe("finance costs brought forward", () => {
  it("are not a cost of the year, so the after-expenses card leaves them out", () => {
    const base = {
      userId: "u",
      source: "rental" as const,
      name: "x",
      frequency: "annual" as const,
      date: "2026-06-06",
      endDate: null,
      notes: null,
      receiptFilename: null,
      receiptMimeType: null,
      receiptData: null,
      createdAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-06T00:00:00.000Z",
    };
    const records: TaxRecord[] = [
      { ...base, id: "i", type: "income", category: "rental_income", amount: 10000 },
      { ...base, id: "a", type: "expense", category: "repairs_maintenance", amount: 500 },
      {
        ...base,
        id: "b",
        type: "expense",
        category: "finance_costs_brought_forward",
        amount: 1570,
      },
    ];
    // Only the 500 of repairs is a cost of 2026/27: 10,000 - 500 = 9,500.
    const { container } = render(
      <TaxHeadline result={calculateUKTax("2026/27", records, 30000, 100)} taxYear="2026/27" />,
    );
    const values = [...container.querySelectorAll("[data-kpi-value]")].map((n) => n.textContent);
    expect(values[1]).toContain("£9,500");
  });
});
