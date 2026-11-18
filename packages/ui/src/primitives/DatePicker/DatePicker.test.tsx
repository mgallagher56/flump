import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { controlProps, FormField } from "../FormField";
import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("formats a selected ISO date in UK format and shows placeholder when empty", () => {
    const { rerender } = render(<DatePicker aria-label="End date" value="" />);
    const trigger = screen.getByRole("button", { name: "End date" });
    expect(trigger.textContent).toContain("Select date");

    rerender(<DatePicker aria-label="End date" value="2026-11-16" />);
    expect(trigger.textContent).toContain("16 Nov 2026");
    // The chosen date stays in the accessible name alongside the label.
    expect(screen.getByRole("button", { name: "End date 16 Nov 2026" })).toBe(trigger);
  });

  it("opens the calendar popover and selects a day", () => {
    const onValueChange = vi.fn();
    render(<DatePicker aria-label="Start date" onValueChange={onValueChange} value="2026-11-16" />);
    fireEvent.click(screen.getByRole("button", { name: /^Start date/ }));
    fireEvent.click(screen.getByRole("button", { name: "20 Nov 2026" }));
    expect(onValueChange).toHaveBeenCalledWith("2026-11-20");
    expect(screen.queryByTestId("datepicker-days")).toBeNull();
  });

  it("navigates to month and year selection and returns cleanly to the day calendar view", () => {
    const onValueChange = vi.fn();
    render(<DatePicker aria-label="Date" onValueChange={onValueChange} value="2026-11-16" />);
    fireEvent.click(screen.getByRole("button", { name: /^Date/ }));

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
    fireEvent.click(screen.getByRole("button", { name: /^Date/ }));
    expect((screen.getByRole("button", { name: "9 Nov 2026" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole("button", { name: "21 Nov 2026" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onValueChange).toHaveBeenCalledWith("");
  });

  const openPicker = (props: Partial<Parameters<typeof DatePicker>[0]> = {}) => {
    const onValueChange = vi.fn();
    render(
      <DatePicker aria-label="Date" onValueChange={onValueChange} value="2026-11-16" {...props} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Date/ }));
    return { onValueChange, grid: screen.getByRole("table") };
  };
  const focused = () => document.activeElement as HTMLElement;

  it("is a table of days with one tab stop and focus on the selected day when it opens", () => {
    const { grid } = openPicker();
    expect(grid.getAttribute("aria-labelledby")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(7);
    // The short name shows; the full name is visually hidden text, so the header is named by it.
    expect(screen.getByRole("columnheader", { name: "Monday" })).toBeTruthy();
    expect(focused().getAttribute("aria-label")).toBe("16 Nov 2026, selected");
    const stops = grid.querySelectorAll("button[tabindex='0']");
    expect(stops).toHaveLength(1);
    expect(screen.getByRole("button", { name: "16 Nov 2026, selected" }).textContent).toBe("16");
    // The selection is stated once, in the day name; the day buttons are not toggle buttons.
    expect(grid.querySelectorAll("button[aria-pressed]")).toHaveLength(0);
  });

  it("focuses today when there is no value", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 9));
    try {
      openPicker({ value: "" });
      expect(focused().getAttribute("aria-label")).toBe("9 Mar 2026");
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves focus with arrows, Home, End, PageUp and PageDown and announces the month", () => {
    const { grid } = openPicker();
    const heading = document.getElementById(grid.getAttribute("aria-labelledby") as string);
    expect(heading?.getAttribute("aria-live")).toBe("polite");
    expect(heading?.textContent).toBe("November 2026");

    fireEvent.keyDown(focused(), { key: "ArrowRight" });
    expect(focused().getAttribute("aria-label")).toBe("17 Nov 2026");
    fireEvent.keyDown(focused(), { key: "ArrowLeft" });
    fireEvent.keyDown(focused(), { key: "ArrowDown" });
    expect(focused().getAttribute("aria-label")).toBe("23 Nov 2026");
    fireEvent.keyDown(focused(), { key: "ArrowUp" });
    expect(focused().getAttribute("aria-label")).toBe("16 Nov 2026, selected");
    // 16 Nov 2026 is a Monday.
    fireEvent.keyDown(focused(), { key: "End" });
    expect(focused().getAttribute("aria-label")).toBe("22 Nov 2026");
    fireEvent.keyDown(focused(), { key: "Home" });
    expect(focused().getAttribute("aria-label")).toBe("16 Nov 2026, selected");
    fireEvent.keyDown(focused(), { key: "PageDown" });
    expect(focused().getAttribute("aria-label")).toBe("16 Dec 2026");
    expect(heading?.textContent).toBe("December 2026");
    fireEvent.keyDown(focused(), { key: "PageUp", shiftKey: true });
    expect(focused().getAttribute("aria-label")).toBe("16 Dec 2025");
    // Crossing a month edge with the arrows changes the visible month.
    fireEvent.keyDown(focused(), { key: "PageDown" });
    for (let i = 0; i < 16; i += 1) fireEvent.keyDown(focused(), { key: "ArrowRight" });
    expect(focused().getAttribute("aria-label")).toBe("1 Feb 2026");
    expect(screen.getByRole("table").querySelectorAll("button[tabindex='0']")).toHaveLength(1);
  });

  it("stops keyboard movement at min and max", () => {
    openPicker({ min: "2026-11-15", max: "2026-11-18" });
    fireEvent.keyDown(focused(), { key: "ArrowDown" });
    expect(focused().getAttribute("aria-label")).toBe("18 Nov 2026");
    fireEvent.keyDown(focused(), { key: "PageUp" });
    expect(focused().getAttribute("aria-label")).toBe("15 Nov 2026");
  });

  it("keeps focus when switching between the day, month and year views", () => {
    openPicker();
    fireEvent.click(screen.getByRole("button", { name: /^Choose month/ }));
    expect(focused().textContent).toBe("Nov");
    fireEvent.click(screen.getByRole("button", { name: /^Choose year/ }));
    expect(focused().textContent).toBe("2026");
    fireEvent.click(screen.getByRole("button", { name: "2027" }));
    expect(focused().getAttribute("aria-label")).toBe("16 Nov 2027");
    fireEvent.click(screen.getByRole("button", { name: /^Choose month/ }));
    fireEvent.click(screen.getByRole("button", { name: "Back to calendar" }));
    expect(focused().getAttribute("aria-label")).toBe("16 Nov 2027");
  });

  it("disables years and months outside min and max", () => {
    openPicker({ min: "2025-03-10", max: "2027-06-01" });
    fireEvent.click(screen.getByRole("button", { name: /^Choose year/ }));
    const year = (label: string) =>
      screen.getByRole("button", { name: label }) as HTMLButtonElement;
    expect(year("2024").disabled).toBe(true);
    expect(year("2025").disabled).toBe(false);
    expect(year("2027").disabled).toBe(false);
    expect(year("2016").disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Previous years" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByRole("button", { name: "Next years" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(year("2025"));
    fireEvent.click(screen.getByRole("button", { name: /^Choose month/ }));
    expect((screen.getByRole("button", { name: "Feb" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Mar" }) as HTMLButtonElement).disabled).toBe(false);
  });

  const tabStops = () => screen.getByRole("table").querySelectorAll("button[tabindex='0']");
  const headingText = () => {
    const grid = screen.getByRole("table");
    return document.getElementById(grid.getAttribute("aria-labelledby") as string)?.textContent;
  };

  it("clamps to min when a year is picked whose month is before min", () => {
    // Viewing January 2026 with min 10 Mar 2025. Picking 2025 would keep January, giving
    // 16 Jan 2025, which is before min, so it clamps to min: 10 Mar 2025, shown in March 2025.
    openPicker({ value: "2026-01-16", min: "2025-03-10" });
    fireEvent.click(screen.getByRole("button", { name: /^Choose year/ }));
    fireEvent.click(screen.getByRole("button", { name: "2025" }));
    expect(headingText()).toBe("March 2025");
    expect(focused().getAttribute("aria-label")).toBe("10 Mar 2025");
    expect((focused() as HTMLButtonElement).disabled).toBe(false);
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0]).toBe(focused());
  });

  it("clamps to max when a year is picked whose month is after max", () => {
    // Viewing November 2026 with max 1 Jun 2027. Picking 2027 would keep November, giving
    // 16 Nov 2027, which is after max, so it clamps to max: 1 Jun 2027, shown in June 2027.
    openPicker({ value: "2026-11-16", max: "2027-06-01" });
    fireEvent.click(screen.getByRole("button", { name: /^Choose year/ }));
    fireEvent.click(screen.getByRole("button", { name: "2027" }));
    expect(headingText()).toBe("June 2027");
    expect(focused().getAttribute("aria-label")).toBe("1 Jun 2027");
    expect((focused() as HTMLButtonElement).disabled).toBe(false);
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0]).toBe(focused());
  });

  // Weekdays worked out by hand from the anchor 1 Jan 2024 = Monday:
  // 2024 is a leap year (366 days, 366 mod 7 = 2), so 1 Jan 2025 = Wednesday.
  // 365 mod 7 = 1 each year after: 1 Jan 2026 = Thursday, 1 Jan 2027 = Friday, 1 Jan 2028 = Saturday.
  // January has 31 days (31 mod 7 = 3), so 1 Feb 2028 = Saturday + 3 = Tuesday.
  // 2028 is divisible by 4 and not a century, so it is a leap year and 29 Feb 2028 exists;
  // 29 Feb = 1 Feb + 28 days, so it is also a Tuesday.
  it("handles a leap day and a Monday-first grid", () => {
    openPicker({ value: "2028-02-29" });
    expect(screen.getByRole("button", { name: /^Date/ }).textContent).toContain("29 Feb 2028");
    expect(focused().getAttribute("aria-label")).toBe("29 Feb 2028, selected");
    expect(headingText()).toBe("February 2028");
    // 1 Feb 2028 is a Tuesday, so the Monday-first grid opens on Monday 31 Jan 2028.
    const firstDay = screen.getByRole("table").querySelector("tbody button");
    expect(firstDay?.getAttribute("aria-label")).toBe("31 Jan 2028");
    expect(screen.getAllByRole("columnheader")[0]?.textContent).toContain("Monday");

    // Home: Tuesday 29 Feb back one day to Monday 28 Feb.
    fireEvent.keyDown(focused(), { key: "Home" });
    expect(focused().getAttribute("aria-label")).toBe("28 Feb 2028");
    // End: Monday 28 Feb forward six days. Feb 2028 has 29 days, so 29 Feb (Tue), 1 Mar (Wed),
    // 2 Mar (Thu), 3 Mar (Fri), 4 Mar (Sat), 5 Mar (Sun).
    fireEvent.keyDown(focused(), { key: "End" });
    expect(focused().getAttribute("aria-label")).toBe("5 Mar 2028");
  });

  it("keeps the day of the month across month and year pages from a leap day", () => {
    openPicker({ value: "2028-02-29" });
    // March has 31 days, so 29 Feb plus one month is 29 Mar 2028.
    fireEvent.keyDown(focused(), { key: "PageDown" });
    expect(focused().getAttribute("aria-label")).toBe("29 Mar 2028");
    expect(headingText()).toBe("March 2028");
    // Back to 29 Feb (February 2028 has 29 days).
    fireEvent.keyDown(focused(), { key: "PageUp" });
    expect(focused().getAttribute("aria-label")).toBe("29 Feb 2028, selected");
    // 2029 is not divisible by 4, so February 2029 has 28 days: 29 Feb clamps to 28 Feb 2029.
    fireEvent.keyDown(focused(), { key: "PageDown", shiftKey: true });
    expect(focused().getAttribute("aria-label")).toBe("28 Feb 2029");
    expect(headingText()).toBe("February 2029");
  });

  it("crosses a year boundary with the arrow keys", () => {
    openPicker({ value: "2026-12-31" });
    expect(headingText()).toBe("December 2026");
    // 31 Dec is the last day of the year, so the next day is 1 Jan 2027.
    fireEvent.keyDown(focused(), { key: "ArrowRight" });
    expect(focused().getAttribute("aria-label")).toBe("1 Jan 2027");
    expect(headingText()).toBe("January 2027");
    expect(tabStops()).toHaveLength(1);
  });

  it("disables the previous month and clamps to min when today is just after min", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 18));
    try {
      openPicker({ value: "", min: "2026-11-15" });
      // No value, so focus starts on today, 18 Nov 2026.
      expect(focused().getAttribute("aria-label")).toBe("18 Nov 2026");
      // The day before 1 Nov is 31 Oct, which is before min 15 Nov, so the previous month is off.
      expect(
        (screen.getByRole("button", { name: "Previous month" }) as HTMLButtonElement).disabled,
      ).toBe(true);
      // ArrowUp is 18 - 7 = 11 Nov, before min, so it clamps to 15 Nov.
      fireEvent.keyDown(focused(), { key: "ArrowUp" });
      expect(focused().getAttribute("aria-label")).toBe("15 Nov 2026");
      for (let day = 1; day <= 14; day += 1) {
        const button = screen.getByRole("button", { name: `${day} Nov 2026` }) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
      }
      expect(
        (screen.getByRole("button", { name: "15 Nov 2026" }) as HTMLButtonElement).disabled,
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("forwards required and describedby, and names the trigger by its label and date", () => {
    render(
      <FormField hint="When the deal ends." label="Contract end date" required>
        {(field) => <DatePicker {...controlProps(field)} value="2026-11-16" />}
      </FormField>,
    );
    const trigger = screen.getByRole("button", { name: "Contract end date 16 Nov 2026" });
    const description = (trigger.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((ref) => document.getElementById(ref)?.textContent)
      .join(" | ");
    expect(description).toBe("When the deal ends. | Required");
    expect(trigger.hasAttribute("aria-required")).toBe(false);
  });

  it("keeps a 2px focus outline offset", async () => {
    await act(async () => {
      render(<DatePicker aria-label="Date" />);
    });
    expect(screen.getByRole("button", { name: "Date" }).className).toMatch(
      /focusVisible:ring-o_2px/,
    );
  });
});
