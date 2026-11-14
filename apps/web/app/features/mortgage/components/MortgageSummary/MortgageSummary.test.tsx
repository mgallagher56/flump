import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageSummary, type MortgageSummaryProps } from "./MortgageSummary";

const base = (over: Partial<MortgageSummaryProps> = {}): MortgageSummaryProps => ({
  propertyCategory: "residential",
  mortgageType: "repayment",
  remainingTerm: 25,
  accountName: "HSBC Fixed Mortgage",
  lastUpdated: "Last updated June 2026",
  saveMessage: null,
  onEdit: vi.fn(),
  ...over,
});

describe("<MortgageSummary />", () => {
  it("lists the saved details the headline does not show, with one Edit button", () => {
    const props = base();
    render(<MortgageSummary {...props} />);
    expect(screen.getByRole("heading", { name: "Your details" })).toBeDefined();
    const card = screen.getByTestId("mortgage-summary");
    expect(card.textContent).toContain("HSBC Fixed Mortgage");
    expect(card.textContent).toContain("Repayment");
    expect(card.textContent).toContain("25 years");
    expect(card.textContent).toContain("Saved. Last updated June 2026");
    // Balance, rate and payment are in the hero and strip, so never repeated here.
    expect(card.textContent).not.toMatch(/£|%/);
    expect(card.textContent).not.toContain("Not set");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(props.onEdit).toHaveBeenCalled();
  });

  it("buy to let lists no account and no term", () => {
    render(
      <MortgageSummary {...base({ propertyCategory: "btl", mortgageType: "interest-only" })} />,
    );
    const card = screen.getByTestId("mortgage-summary");
    expect(card.textContent).toContain("Buy to let");
    expect(card.textContent).toContain("Interest-only");
    expect(card.textContent).not.toContain("Mortgage account");
    expect(card.textContent).not.toContain("Years left");
  });

  it("announces a save, and leaves out a term that is not saved", () => {
    render(<MortgageSummary {...base({ remainingTerm: 0, saveMessage: "Saved interest rate" })} />);
    expect(screen.getByRole("status").textContent).toBe("Saved interest rate");
    expect(screen.queryByText("Years left")).toBeNull();
  });

  it("shows years left in years and months, never as a decimal", () => {
    render(<MortgageSummary {...base({ remainingTerm: 218 / 12 })} />);
    const card = screen.getByTestId("mortgage-summary");
    expect(card.textContent).toContain("18 years 2 months");
    expect(card.textContent).not.toMatch(/18\.2/);
  });
});
