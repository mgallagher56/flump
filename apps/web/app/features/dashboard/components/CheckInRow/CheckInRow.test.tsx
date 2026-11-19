import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { CheckInRow, checkInLine, monthName } from "./CheckInRow";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderRow = (props: Parameters<typeof CheckInRow>[0]) =>
  render(
    <MemoryRouter>
      <CheckInRow {...props} />
    </MemoryRouter>,
  );

describe("CheckInRow", () => {
  it("says in one line when the last check-in was, with one button", () => {
    renderRow({ currentMonth: "2026-11", lastCheckInMonth: "2026-10" });
    const row = screen.getByTestId("monthly-check-in-card");
    expect(screen.getByRole("heading", { name: "Monthly check-in" })).toBeTruthy();
    expect(screen.getByText("Last check-in: October 2026")).toBeTruthy();
    expect(row.querySelectorAll("p")).toHaveLength(1);
    const link = screen.getByRole("link", { name: "Start monthly check-in" });
    expect(link.getAttribute("href")).toBe("/app/accounts/history?checkIn=1");
    expect(row.textContent).not.toMatch(/overdue|streak|missed|£/i);
  });

  it("offers Continue check-in when part done (Rule B17)", () => {
    renderRow({ currentMonth: "2026-11", lastCheckInMonth: "2026-10", partDone: true });
    expect(screen.getByRole("link", { name: "Continue check-in" })).toBeTruthy();
  });

  it("offers to start check-in when there has never been one", () => {
    renderRow({ currentMonth: "2026-11", lastCheckInMonth: null });
    expect(screen.getByText("No monthly check-in yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start monthly check-in" })).toBeTruthy();
  });

  it("shows, naming the month, when the last check-in could not be read (CH-3)", () => {
    renderRow({ currentMonth: "2026-11", lastCheckInMonth: undefined, today: "2026-11-02" });
    expect(screen.getByText("Record your November balances")).toBeTruthy();
  });

  it("waits for the saved check-in day, and shows at once if last month was missed", () => {
    const before = renderRow({
      currentMonth: "2026-11",
      lastCheckInMonth: "2026-10",
      checkInDay: 28,
      today: "2026-11-05",
    });
    expect(before.container.innerHTML).toBe("");
    before.unmount();
    const onDay = renderRow({
      currentMonth: "2026-11",
      lastCheckInMonth: "2026-10",
      checkInDay: 28,
      today: "2026-11-28",
    });
    expect(screen.getByText(/^Last check-in:/)).toBeTruthy();
    onDay.unmount();
    renderRow({
      currentMonth: "2026-11",
      lastCheckInMonth: "2026-09",
      checkInDay: 28,
      today: "2026-11-05",
    });
    expect(screen.getByText(/^Last check-in:/)).toBeTruthy();
  });

  it("draws nothing once this month's check-in is done", () => {
    const { container } = renderRow({ currentMonth: "2026-11", lastCheckInMonth: "2026-11" });
    expect(container.innerHTML).toBe("");
  });

  it("names the month in en-GB from the data", () => {
    expect(monthName("2027-01")).toBe("January");
    expect(monthName("not-a-month")).toBe("not-a-month");
    expect(checkInLine({ currentMonth: "2026-03", lastCheckInMonth: "2026-01" })).toBe(
      "Last check-in: January 2026",
    );
  });
});
