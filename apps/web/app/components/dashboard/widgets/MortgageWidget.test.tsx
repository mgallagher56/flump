import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageWidget } from "./MortgageWidget";

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const noop = vi.fn();
const baseProps = {
  editMode: false,
  size: "normal" as const,
  onHide: noop,
  onMoveDown: noop,
  onMoveUp: noop,
  onToggleSize: noop,
};

describe("MortgageWidget", () => {
  it("shows the payment when rate and term are known", () => {
    render(
      <MortgageWidget
        {...baseProps}
        data={{
          mortgageBalance: 200000,
          interestRate: 4.2,
          remainingTermYears: 22,
          hasMortgageAccount: true,
        }}
      />,
    );
    expect(screen.getByText(/Monthly:/)).toBeTruthy();
    expect(screen.queryByText("Add your rate and term on Mortgage")).toBeNull();
  });

  it("null rate hides the payment and shows the prompt", () => {
    render(
      <MortgageWidget
        {...baseProps}
        data={{
          mortgageBalance: 200000,
          interestRate: null,
          remainingTermYears: null,
          hasMortgageAccount: true,
        }}
      />,
    );
    expect(screen.queryByText(/Monthly:/)).toBeNull();
    expect(screen.queryByText(/4\.50%/)).toBeNull();
    const prompt = screen.getByText("Add your rate and term on Mortgage");
    expect(prompt.closest("a")?.getAttribute("href")).toBe("/app/mortgage");
  });

  it("null term alone also hides the payment", () => {
    render(
      <MortgageWidget
        {...baseProps}
        data={{
          mortgageBalance: 200000,
          interestRate: 4.2,
          remainingTermYears: null,
          hasMortgageAccount: true,
        }}
      />,
    );
    expect(screen.queryByText(/Monthly:/)).toBeNull();
    expect(screen.getByText("Add your rate and term on Mortgage")).toBeTruthy();
  });
});
