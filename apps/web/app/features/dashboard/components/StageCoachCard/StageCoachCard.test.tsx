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
  it("shows the debt and the projected debt-free date as plain facts", () => {
    renderCard({ unsecuredDebt: 3000, debtFreeDate: "March 2029", weeklyAllowance: 120 });
    expect(screen.getByText("Your unsecured debt and payoff date")).toBeDefined();
    expect(screen.getByText(/£3,000 of unsecured debt remaining/)).toBeDefined();
    expect(screen.getByText(/Projected debt-free date: March 2029/)).toBeDefined();
    expect(screen.getByText(/Safe to spend: £120 a week/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Open debt payoff" }).getAttribute("href")).toBe(
      "/app/debt",
    );
  });

  it("keeps the teal next-step treatment with a solid payoff link", () => {
    renderCard({ unsecuredDebt: 3000, debtFreeDate: "March 2029", weeklyAllowance: 120 });
    const card = screen.getByTestId("stage-coach-card");
    expect(card.className).toContain("bg-c_primary.subtle");
    expect(card.className).toContain("bd-c_primary.border");
    const link = screen.getByRole("link", { name: "Open debt payoff" });
    expect(link.className).toContain("bg_primary.solid");
  });

  it("is a labelled summary with links only: no action button and no stage wording (R4)", () => {
    renderCard({ unsecuredDebt: 3000, debtFreeDate: "March 2029", weeklyAllowance: 120 });
    expect(
      screen.getByRole("region", { name: "Your unsecured debt and payoff date" }),
    ).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.body.textContent).not.toMatch(/stage|clear your|first\b/i);
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
