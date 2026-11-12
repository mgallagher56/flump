import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatMoney, Money, Num } from "./Money";

const text = (container: HTMLElement) => container.textContent;

describe("Money", () => {
  it("formats whole pounds in en-GB by default", () => {
    const { container } = render(<Money value={1234} />);
    expect(text(container)).toBe("£1,234");
  });

  it("renders a real zero as £0, not Not set", () => {
    const { container } = render(<Money value={0} />);
    expect(text(container)).toBe("£0");
    expect(container.querySelector("[data-unknown]")).toBeNull();
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("renders Not set for %s and never £0", (_name, value) => {
    const { container } = render(<Money value={value} />);
    expect(text(container)).toBe("Not set");
    expect(text(container)).not.toContain("£");
    expect(container.querySelector("[data-unknown='true']")).not.toBeNull();
  });

  it("supports a custom label and an action beside Not set", () => {
    render(
      <Money
        notSetAction={<button type="button">Add balance</button>}
        notSetLabel="Not provided"
        value={null}
      />,
    );
    expect(screen.getByText("Not provided")).toBeDefined();
    expect(screen.getByRole("button", { name: "Add balance" })).toBeDefined();
  });

  it("formats negatives as -£1,234 with screen-reader text 'minus'", () => {
    const { container } = render(<Money value={-1234} />);
    expect(container.querySelector("[aria-hidden='true']")?.textContent).toBe("-£1,234");
    expect(screen.getByText("minus £1,234")).toBeDefined();
  });

  it("does not add screen-reader text for positives", () => {
    const { container } = render(<Money value={1234} />);
    expect(container.querySelector("[aria-hidden]")).toBeNull();
  });

  it("formats 1e9 with grouping", () => {
    const { container } = render(<Money value={1e9} />);
    expect(text(container)).toBe("£1,000,000,000");
  });

  it("never renders -£0 for negative zero or values that round to zero", () => {
    expect(formatMoney(-0).text).toBe("£0");
    expect(formatMoney(-0.4).text).toBe("£0");
    expect(formatMoney(-0.004, { fractionDigits: 2 }).text).toBe("£0.00");
  });

  it("honours fractionDigits", () => {
    expect(formatMoney(1234.5, { fractionDigits: 2 }).text).toBe("£1,234.50");
    expect(formatMoney(1234.5).text).toBe("£1,235");
    expect(formatMoney(-1234.5, { fractionDigits: 2 }).text).toBe("-£1,234.50");
  });

  it("honours signDisplay", () => {
    expect(formatMoney(50, { signDisplay: "always" })).toEqual({
      text: "+£50",
      spoken: "plus £50",
    });
    expect(formatMoney(-50, { signDisplay: "always" }).text).toBe("-£50");
    expect(formatMoney(-50, { signDisplay: "never" })).toEqual({ text: "£50" });
    expect(formatMoney(50, { signDisplay: "auto" }).text).toBe("£50");
  });

  it("supports other currencies", () => {
    expect(formatMoney(1000, { currency: "EUR" }).text).toBe("€1,000");
  });

  it("applies tabular-nums via the recipe class", () => {
    const { container } = render(<Money size="kpi" value={5} />);
    expect(container.firstElementChild?.className).toContain("fv-num_tabular-nums");
  });

  it("pairs id and data-testid", () => {
    const { container } = render(<Money id="net-worth" value={5} />);
    const el = container.querySelector("#net-worth");
    expect(el?.getAttribute("data-testid")).toBe("net-worth");
  });
});

describe("Num", () => {
  it("formats plain numbers with en-GB grouping", () => {
    const { container } = render(<Num value={1234567} />);
    expect(text(container)).toBe("1,234,567");
  });

  it("formats percentages with fractionDigits", () => {
    const { container } = render(<Num fractionDigits={1} kind="percent" value={4.5} />);
    expect(text(container)).toBe("4.5%");
  });

  it("renders a real 0% but Not set for unknown", () => {
    const zero = render(<Num kind="percent" value={0} />);
    expect(text(zero.container)).toBe("0%");
    const unknown = render(<Num kind="percent" value={Number.NaN} />);
    expect(text(unknown.container)).toBe("Not set");
  });

  it("handles negative percentages and sign display", () => {
    const { container } = render(<Num fractionDigits={1} kind="percent" value={-2.5} />);
    expect(container.querySelector("[aria-hidden='true']")?.textContent).toBe("-2.5%");
    expect(screen.getByText("minus 2.5 per cent")).toBeDefined();
    const plus = render(<Num kind="percent" signDisplay="always" value={3} />);
    expect(text(plus.container)).toContain("+3%");
  });

  it("renders Not set for null and undefined", () => {
    expect(text(render(<Num value={null} />).container)).toBe("Not set");
    expect(text(render(<Num value={undefined} />).container)).toBe("Not set");
  });
});
