import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { StageCoachCard, type StageCoachCardProps } from "./StageCoachCard";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderCard = (props: StageCoachCardProps) =>
  render(
    <MemoryRouter>
      <StageCoachCard {...props} />
    </MemoryRouter>,
  );

describe("<StageCoachCard />", () => {
  it("shows the stage, the debt and the debt-free target", () => {
    renderCard({ unsecuredDebt: 3000, debtFreeDate: "March 2029", weeklyAllowance: 120 });
    expect(screen.getByText("Stage 1: stabilise and clear")).toBeDefined();
    expect(screen.getByText(/£3,000 of unsecured debt remaining/)).toBeDefined();
    expect(screen.getByText(/Debt-free target: March 2029/)).toBeDefined();
    expect(screen.getByText(/Safe to spend: £120 a week/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Open debt payoff" }).getAttribute("href")).toBe(
      "/app/debt",
    );
  });

  it("asks for a budget instead of inventing an allowance", () => {
    renderCard({ unsecuredDebt: 3000, debtFreeDate: null, weeklyAllowance: null });
    expect(screen.queryByText(/Safe to spend:/)).toBeNull();
    expect(screen.getByText(/Debt-free date not calculated yet/)).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: /Add your budget to see your safe to spend/ })
        .getAttribute("href"),
    ).toBe("/app/budget");
  });
});
