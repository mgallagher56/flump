import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { MortgageWidget } from "./MortgageWidget";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderWidget = (mortgageBalance: number, hasMortgageAccount = true) =>
  render(
    <MemoryRouter>
      <MortgageWidget data={{ mortgageBalance, hasMortgageAccount }} />
    </MemoryRouter>,
  );

describe("MortgageWidget", () => {
  it("shows the saved balance as a positive amount with one link", () => {
    renderWidget(-186000);
    expect(screen.getByText("£186,000")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open mortgage/ })).toBeTruthy();
  });

  it('reads "Not set" without a mortgage account', () => {
    renderWidget(0, false);
    expect(screen.getByText("Not set")).toBeTruthy();
  });
});
