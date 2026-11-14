import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { CHECK_IN_ROUTE, isCheckInDue, MonthlyCheckInCard } from "./MonthlyCheckInCard";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderCard = (lastRecordedMonth: string | null) =>
  render(
    <MemoryRouter>
      <MonthlyCheckInCard currentMonth="2026-11" lastRecordedMonth={lastRecordedMonth} />
    </MemoryRouter>,
  );

describe("MonthlyCheckInCard", () => {
  it("invites a first check-in when nothing is recorded", () => {
    renderCard(null);
    expect(screen.getByRole("heading", { name: "Monthly check-in" })).toBeDefined();
    expect(screen.getByText(/Record your balances once a month/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Record balances" }).getAttribute("href")).toBe(
      CHECK_IN_ROUTE,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("says when balances were last recorded, without overdue wording", () => {
    renderCard("2026-08");
    const text = screen.getByText(/Last recorded month: August 2026/).textContent ?? "";
    expect(text).toMatch(/Balances for this month are not recorded yet/);
    expect(text).not.toMatch(/overdue|behind|missed|streak/i);
    expect(screen.getByRole("link", { name: "Update balances" })).toBeDefined();
  });

  it("shows nothing once this month is recorded", () => {
    const { container } = renderCard("2026-11");
    expect(container.innerHTML).toBe("");
    expect(isCheckInDue({ currentMonth: "2026-11", lastRecordedMonth: "2026-11" })).toBe(false);
  });

  it("keeps money out of the link", () => {
    expect(CHECK_IN_ROUTE).toBe("/app/accounts/history?checkIn=1");
  });
});
