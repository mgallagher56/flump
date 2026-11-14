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
  it("says in one line which month is not recorded yet, with one button", () => {
    renderRow({ currentMonth: "2026-11", lastRecordedMonth: "2026-10" });
    const row = screen.getByTestId("monthly-check-in-card");
    expect(screen.getByRole("heading", { name: "Monthly check-in" })).toBeTruthy();
    expect(screen.getByText("November balances not recorded yet")).toBeTruthy();
    expect(row.querySelectorAll("p")).toHaveLength(1);
    const link = screen.getByRole("link", { name: "Update balances" });
    expect(link.getAttribute("href")).toBe("/app/accounts/history?checkIn=1");
    expect(row.textContent).not.toMatch(/overdue|streak|missed|£/i);
  });

  it("offers to record balances when nothing is recorded yet", () => {
    renderRow({ currentMonth: "2026-11", lastRecordedMonth: null });
    expect(screen.getByText("No balances recorded yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Record balances" })).toBeTruthy();
  });

  it("draws nothing once this month is recorded", () => {
    const { container } = renderRow({ currentMonth: "2026-11", lastRecordedMonth: "2026-11" });
    expect(container.innerHTML).toBe("");
  });

  it("names the month in en-GB from the data", () => {
    expect(monthName("2027-01")).toBe("January");
    expect(monthName("not-a-month")).toBe("not-a-month");
    expect(checkInLine({ currentMonth: "2026-03", lastRecordedMonth: "2026-01" })).toBe(
      "March balances not recorded yet",
    );
  });
});
