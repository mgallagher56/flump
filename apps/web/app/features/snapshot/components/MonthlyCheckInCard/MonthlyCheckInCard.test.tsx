import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { CHECK_IN_ROUTE, HISTORY_ROUTE, MonthlyCheckInCard } from "./MonthlyCheckInCard";

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
    expect(screen.getByRole("link", { name: "Update balances" }).getAttribute("href")).toBe(
      CHECK_IN_ROUTE,
    );
    expect(screen.queryByRole("link", { name: "View history" })).toBeNull();
  });

  it("says when balances were last recorded, without overdue wording", () => {
    renderCard("2026-08");
    const text = screen.getByText(/Last recorded month: August 2026/).textContent ?? "";
    expect(text).toMatch(/whenever suits you/);
    expect(text).not.toMatch(/overdue|behind|missed|streak/i);
    expect(screen.getByRole("link", { name: "View history" }).getAttribute("href")).toBe(
      HISTORY_ROUTE,
    );
  });

  it("confirms this month is recorded", () => {
    renderCard("2026-11");
    expect(screen.getByText(/Balances recorded for November 2026/)).toBeDefined();
  });

  it("keeps money out of the link", () => {
    expect(CHECK_IN_ROUTE).toBe("/app/accounts/history?checkIn=1");
  });
});
