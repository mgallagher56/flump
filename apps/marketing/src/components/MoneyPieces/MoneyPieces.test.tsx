import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoneyPiece } from "./MoneyPieces";

const PIECES = [
  ["card", "Cash and savings"],
  ["payslip", "Payslip"],
  ["receipt", "This month"],
  ["statement", "Mortgage statement"],
  ["pension", "Pension statement"],
  ["credit", "Credit card"],
] as const;

describe("MoneyPiece", () => {
  it.each(PIECES)(
    "draws the %s piece with its title and an 'Example' tag in real text",
    (k, title) => {
      const { container } = render(<MoneyPiece k={k} />);
      const piece = container.firstElementChild as HTMLElement;
      expect(within(piece).getByText(title)).toBeDefined();
      expect(within(piece).getAllByText("Example", { exact: true })).toHaveLength(1);
    },
  );

  it("shows the sample household's figures in en-GB pounds", () => {
    render(<MoneyPiece k="card" />);
    expect(screen.getByText("£21,000")).toBeDefined();
    expect(screen.getByText("3.5% AER")).toBeDefined();
  });

  it("marks the receipt's total, and only it, as where the hero's left over figure lifts off", () => {
    const { container, unmount } = render(<MoneyPiece k="receipt" />);
    const from = container.querySelectorAll("[data-hero-from]");
    expect(from).toHaveLength(1);
    expect(from[0]?.getAttribute("data-hero-from")).toBe("left");
    unmount();
    const payslip = render(<MoneyPiece k="payslip" />);
    expect(payslip.container.querySelectorAll("[data-hero-from]")).toHaveLength(0);
  });
});
