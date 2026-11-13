import { calculateMonthlyMortgagePayment } from "@flump/finance-engine";
import { formatMoney } from "@repo/ui";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { MortgageWidget, type MortgageWidgetProps } from "./MortgageWidget";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const known: MortgageWidgetProps["data"] = {
  mortgageBalance: 200000,
  interestRate: 4.2,
  remainingTermYears: 22,
  hasMortgageAccount: true,
};

const renderWidget = (data: MortgageWidgetProps["data"]) =>
  render(
    <MemoryRouter>
      <MortgageWidget data={data} />
    </MemoryRouter>,
  );

describe("<MortgageWidget />", () => {
  it("shows the engine's monthly payment when rate and term are known", () => {
    renderWidget(known);
    const expected = formatMoney(calculateMonthlyMortgagePayment(200000, 4.2, 22 * 12), {
      fractionDigits: 2,
    }).text;
    expect(screen.getByText(expected)).toBeDefined();
    expect(screen.getByText("£200,000")).toBeDefined();
    expect(screen.getByText("4.20%")).toBeDefined();
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.queryByRole("link", { name: "Add rate and term" })).toBeNull();
  });

  it("renders the title as the only heading and never a figure", () => {
    renderWidget(known);
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("Mortgage");
  });

  it("shows Not set linking to the mortgage page when rate and term are unknown", () => {
    renderWidget({ ...known, interestRate: null, remainingTermYears: null });
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.getByRole("link", { name: "Add rate and term" }).getAttribute("href")).toBe(
      "/app/mortgage",
    );
    expect(screen.queryByText(/£0/)).toBeNull();
    expect(screen.queryByText(/a month/)).toBeNull();
  });

  it("treats a known rate with an unknown term as Not set", () => {
    renderWidget({ ...known, remainingTermYears: null });
    expect(screen.getByText("4.20%")).toBeDefined();
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.getByRole("link", { name: "Add rate and term" })).toBeDefined();
  });

  it("does not invent an overpayment or a default", () => {
    renderWidget(known);
    expect(screen.queryByText(/overpay/i)).toBeNull();
    expect(screen.queryByText(/£200\b(?!,)/)).toBeNull();
    expect(screen.queryByText(/\+£/)).toBeNull();
  });

  it("says there is no balance rather than showing £0", () => {
    renderWidget({ ...known, mortgageBalance: 0 });
    expect(screen.getByText("No mortgage balance")).toBeDefined();
    expect(screen.queryByText("Estimated monthly payment")).toBeNull();
  });
});
