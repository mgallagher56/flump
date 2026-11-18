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
    return { onValueChange, grid: screen.getByRole("grid") };
  };
  const focused = () => document.activeElement as HTMLElement;

  it("is a WAI-ARIA date grid with one tab stop and focus on the selected day when it opens", () => {
    const { grid } = openPicker();
    expect(grid.getAttribute("aria-labelledby")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(7);
    // The short name shows; the full name is visually hidden text, so the header is named by it.
    expect(screen.getByRole("columnheader", { name: "Monday" })).toBeTruthy();
    expect(focused().getAttribute("aria-label")).toBe("16 Nov 2026, selected");
    const stops = grid.querySelectorAll("button[tabindex='0']");
    expect(stops).toHaveLength(1);
    expect(screen.getByRole("gridcell", { selected: true }).textContent).toBe("16");
    // The selection is stated once, on the gridcell; the day buttons are not toggle buttons.
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
    expect(screen.getByRole("grid").querySelectorAll("button[tabindex='0']")).toHaveLength(1);
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
