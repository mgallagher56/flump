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
    expect(screen.getByRole("link", { name: "Start monthly check-in" }).getAttribute("href")).toBe(
      CHECK_IN_ROUTE,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("says when balances were last recorded, without overdue wording", () => {
    renderCard("2026-08");
    const text = screen.getByText(/Last recorded month: August 2026/).textContent ?? "";
    expect(text).toMatch(/Balances for this month are not recorded yet/);
    expect(text).not.toMatch(/overdue|behind|missed|streak/i);
    expect(screen.getByRole("link", { name: "Start monthly check-in" })).toBeDefined();
  });

  it("shows nothing once this month is recorded", () => {
    const { container } = renderCard("2026-11");
    expect(container.innerHTML).toBe("");
    expect(isCheckInDue({ currentMonth: "2026-11", lastRecordedMonth: "2026-11" })).toBe(false);
  });

  it("waits for the chosen check-in day when last month was recorded", () => {
    const base = { currentMonth: "2026-11", lastRecordedMonth: "2026-10", checkInDay: 28 };
    expect(isCheckInDue({ ...base, today: "2026-11-27" })).toBe(false);
    expect(isCheckInDue({ ...base, today: "2026-11-28" })).toBe(true);
    const { container } = render(
      <MemoryRouter>
        <MonthlyCheckInCard {...base} today="2026-11-05" />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows straight away when last month was not recorded either", () => {
    expect(
      isCheckInDue({
        currentMonth: "2026-11",
        lastRecordedMonth: "2026-09",
        checkInDay: 28,
        today: "2026-11-05",
      }),
    ).toBe(true);
  });

  it("keeps money out of the link", () => {
    expect(CHECK_IN_ROUTE).toBe("/app/accounts/history?checkIn=1");
  });
});
