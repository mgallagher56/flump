import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPI_PROMPT_TITLE, SavingsSummaryCards } from "./SavingsSummaryCards";

describe("SavingsSummaryCards", () => {
  it("shows the hero and up to 3 real KPIs", () => {
    const { container } = render(
      <SavingsSummaryCards
        accountCount={2}
        averageRate={4}
        hasIsaAccount
        isaUsed={2400}
        monthlySaving={300}
        totalSavingsBalance={21000}
      />,
    );
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(screen.getByText("Total savings")).toBeDefined();
    expect(screen.getByText("£21,000")).toBeDefined();
    expect(screen.getByText("Saved each month")).toBeDefined();
    expect(screen.getByText("Average rate")).toBeDefined();
    expect(screen.getByText("4%")).toBeDefined();
    expect(screen.getByText("Paid into ISAs this tax year")).toBeDefined();
    // A fact from saved figures, so no Estimate chip.
    expect(screen.queryByText("Estimate")).toBeNull();
    expect(screen.queryByText("Weighted by balance (AER)")).toBeNull();
  });

  it("hides cards without a real value instead of showing £0 or 0%", () => {
    const { container } = render(
      <SavingsSummaryCards
        accountCount={1}
        averageRate={0}
        hasIsaAccount
        isaUsed={null}
        monthlySaving={250}
        totalSavingsBalance={5000}
      />,
    );
    expect(screen.queryByText("Average rate")).toBeNull();
    // An ISA with no saving is stated as a fact in words, never as £0.
    expect(screen.getByText("Paid into ISAs this tax year")).toBeDefined();
    expect(screen.getByText("None")).toBeDefined();
    expect(container.textContent).not.toMatch(/£0(?![\d,])|0\.00%/);
  });

  it("leaves out the ISA card when no account is an ISA, and says Rate for one account", () => {
    render(
      <SavingsSummaryCards
        accountCount={1}
        averageRate={4.5}
        hasIsaAccount={false}
        isaUsed={null}
        monthlySaving={150}
        totalSavingsBalance={3200}
      />,
    );
    expect(screen.queryByText("Paid into ISAs this tax year")).toBeNull();
    expect(screen.getByText("Rate")).toBeDefined();
    expect(screen.getByText("4.5%")).toBeDefined();
    expect(screen.getByText("AER on your account")).toBeDefined();
  });

  it("shows one prompt when nothing is set", () => {
    render(
      <SavingsSummaryCards
        accountCount={1}
        averageRate={null}
        hasIsaAccount={false}
        isaUsed={null}
        monthlySaving={null}
        totalSavingsBalance={5000}
      />,
    );
    expect(screen.getByText(KPI_PROMPT_TITLE)).toBeDefined();
    expect(screen.queryByText("Not set")).toBeNull();
  });
});
