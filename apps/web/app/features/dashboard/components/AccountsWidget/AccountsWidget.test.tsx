import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AccountsWidget } from "./AccountsWidget";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderWidget = (count: number) =>
  render(
    <MemoryRouter>
      <AccountsWidget data={{ accountsCount: count }} />
    </MemoryRouter>,
  );

describe("AccountsWidget", () => {
  it("shows how many accounts are added and never repeats net worth", () => {
    renderWidget(3);
    expect(screen.getByText("3 accounts")).toBeTruthy();
    expect(screen.queryByText(/net worth/i)).toBeNull();
    expect(screen.getByRole("link", { name: /Open accounts/ }).getAttribute("href")).toBe(
      "/app/accounts",
    );
  });

  it('reads "Not set" with one add link when there are no accounts', () => {
    renderWidget(0);
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Add an account/ })).toBeTruthy();
  });
});
