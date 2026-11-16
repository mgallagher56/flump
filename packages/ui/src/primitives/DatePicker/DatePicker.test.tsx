import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("formats a selected ISO date in UK format and shows placeholder when empty", () => {
    const { rerender } = render(<DatePicker aria-label="End date" value="" />);
    const trigger = screen.getByRole("button", { name: "End date" });
    expect(trigger.textContent).toContain("Select date");

    rerender(<DatePicker aria-label="End date" value="2026-11-16" />);
    expect(trigger.textContent).toContain("16 Nov 2026");
  });

  it("opens the calendar popover and selects a day", () => {
    const onValueChange = vi.fn();
    render(<DatePicker aria-label="Start date" onValueChange={onValueChange} value="2026-11-16" />);
    fireEvent.click(screen.getByRole("button", { name: "Start date" }));
    fireEvent.click(screen.getByRole("button", { name: "20 Nov 2026" }));
    expect(onValueChange).toHaveBeenCalledWith("2026-11-20");
    expect(screen.queryByTestId("datepicker-days")).toBeNull();
  });

  it("navigates to month and year selection and returns cleanly to the day calendar view", () => {
    const onValueChange = vi.fn();
    render(<DatePicker aria-label="Date" onValueChange={onValueChange} value="2026-11-16" />);
    fireEvent.click(screen.getByRole("button", { name: "Date" }));

    // Switch to month view and return via Back to calendar button
    fireEvent.click(screen.getByRole("button", { name: /^Choose month/ }));
    expect(screen.queryByTestId("datepicker-days")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to calendar" }));
    expect(screen.getByTestId("datepicker-days")).toBeDefined();

    // Switch to year view, pick a year, and return to day calendar view
    fireEvent.click(screen.getByRole("button", { name: /^Choose year/ }));
    expect(screen.queryByTestId("datepicker-days")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "2027" }));
    expect(screen.getByTestId("datepicker-days")).toBeDefined();
    expect(screen.getByRole("button", { name: /^Choose year/ }).textContent).toBe("2027");

    // Pick a month and select a day
    fireEvent.click(screen.getByRole("button", { name: /^Choose month/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apr" }));
    expect(screen.getByTestId("datepicker-days")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "5 Apr 2027" }));
    expect(onValueChange).toHaveBeenCalledWith("2027-04-05");
  });

  it("disables dates outside min and max and supports clearing", () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        aria-label="Date"
        max="2026-11-20"
        min="2026-11-10"
        onValueChange={onValueChange}
        value="2026-11-16"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    expect((screen.getByRole("button", { name: "9 Nov 2026" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole("button", { name: "21 Nov 2026" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onValueChange).toHaveBeenCalledWith("");
  });
});
