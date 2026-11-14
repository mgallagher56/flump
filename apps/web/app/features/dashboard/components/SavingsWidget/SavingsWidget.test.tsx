import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SavingsWidget } from "./SavingsWidget";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderWidget = (data: Parameters<typeof SavingsWidget>[0]["data"]) =>
  render(
    <MemoryRouter>
      <SavingsWidget data={data} />
    </MemoryRouter>,
  );

describe("SavingsWidget", () => {
  it("shows the saved balance and no forecast", () => {
    renderWidget({ totalSavingsBalance: 12000, accountsCount: 2 });
    expect(screen.getByText("£12,000")).toBeTruthy();
    expect(screen.queryByText(/forecast|estimate/i)).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it('reads "Not set" when there is no savings account', () => {
    renderWidget({ totalSavingsBalance: 0, accountsCount: 0 });
    expect(screen.getByText("Not set")).toBeTruthy();
  });
});
