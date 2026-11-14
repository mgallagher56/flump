import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deltaTone, KpiCard } from "./KpiCard";

describe("KpiCard Primitive", () => {
  it("renders label, value, and delta badge", () => {
    render(
      <KpiCard
        deltaText="+12% YoY"
        deltaVariant="positive"
        label="Total S&S ISA Balance"
        subtext="Max capacity: £20,000 / tax year"
        value="£42,850"
      />,
    );
    expect(screen.getByText("Total S&S ISA Balance")).toBeDefined();
    expect(screen.getByText("£42,850")).toBeDefined();
    expect(screen.getByText("+12% YoY")).toBeDefined();
  });

  it("renders Not set for null and undefined values, never a zero", () => {
    const { container, rerender } = render(<KpiCard label="Net worth" value={null} />);
    expect(screen.getByText("Not set")).toBeDefined();
    expect(container.textContent).not.toContain("0");
    rerender(<KpiCard label="Net worth" />);
    expect(screen.getByText("Not set")).toBeDefined();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("treats numeric %s as empty", (value) => {
    render(<KpiCard label="Net worth" value={value} />);
    expect(screen.getByText("Not set")).toBeDefined();
  });

  it("keeps an empty string as given", () => {
    render(<KpiCard label="Net worth" value="" />);
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("sets Not set smaller and lighter than a value (numeric.unset, muted)", () => {
    render(<KpiCard label="Net worth" value={null} />);
    const notSet = screen.getByText("Not set");
    expect(notSet.className).toContain("textStyle_numeric.unset");
    expect(notSet.className).toContain("text.muted");
    expect(notSet.className).not.toContain("numeric.kpi");
  });

  it("marks an unset card for KpiStrip, and honours the unset override", () => {
    const { container, rerender } = render(<KpiCard label="Rate" value={null} />);
    expect(container.firstElementChild?.getAttribute("data-unset")).toBe("true");
    rerender(<KpiCard label="Rate" value="4.5%" />);
    expect(container.firstElementChild?.hasAttribute("data-unset")).toBe(false);
    rerender(<KpiCard label="Rate" loading value={null} />);
    expect(container.firstElementChild?.hasAttribute("data-unset")).toBe(false);
    rerender(<KpiCard label="Rate" unset value="Unknown" />);
    expect(container.firstElementChild?.getAttribute("data-unset")).toBe("true");
  });

  it("keeps the value in its own row, with the badge below it", () => {
    render(<KpiCard deltaText="+2%" label="Savings" value="£4,000" />);
    const valueRow = screen.getByText("£4,000").parentElement;
    expect(valueRow?.textContent).toBe("£4,000");
    expect(valueRow?.nextElementSibling?.textContent).toBe("+2%");
  });

  it("renders without a caption", () => {
    const { container } = render(<KpiCard label="Savings" value="£4,000" />);
    expect(container.innerHTML).not.toContain("textStyle_body.sm");
  });

  it("renders a real zero value as given", () => {
    render(<KpiCard label="Debt" value="£0" />);
    expect(screen.getByText("£0")).toBeDefined();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("shows the empty action and a custom not set label", () => {
    render(
      <KpiCard
        emptyAction={<button type="button">Add balance</button>}
        label="Savings"
        notSetLabel="Not provided"
        value={undefined}
      />,
    );
    expect(screen.getByText("Not provided")).toBeDefined();
    expect(screen.getByRole("button", { name: "Add balance" })).toBeDefined();
  });

  it("marks the card busy and hides the value while loading", () => {
    const { container } = render(<KpiCard label="Net worth" loading value="£1,000" />);
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByText("£1,000")).toBeNull();
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.getByText("Loading")).toBeDefined();
  });

  it("renders the delta as an arrow plus text, not colour alone", () => {
    const { container } = render(
      <KpiCard delta={{ direction: "up", text: "+£240/mo" }} label="Savings" value="£4,000" />,
    );
    expect(screen.getByText("+£240/mo")).toBeDefined();
    expect(screen.getByText("Up")).toBeDefined();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies the liability polarity rule", () => {
    expect(deltaTone("down", "liability")).toBe("positive");
    expect(deltaTone("up", "liability")).toBe("danger");
    expect(deltaTone("up", "asset")).toBe("positive");
    expect(deltaTone("down")).toBe("danger");
    expect(deltaTone("flat", "liability")).toBe("neutral");
  });

  it("describes a falling liability as Down with positive styling", () => {
    const { container } = render(
      <KpiCard
        delta={{ direction: "down", text: "-£240", polarity: "liability" }}
        label="Mortgage"
        value="£180,000"
      />,
    );
    expect(screen.getByText("Down")).toBeDefined();
    expect(container.innerHTML).toContain("status.positive");
  });

  it("uses no inline styles", () => {
    const { container } = render(
      <KpiCard delta={{ direction: "flat", text: "No change" }} label="Savings" value="£1" />,
    );
    expect(container.querySelector("[style]")).toBeNull();
  });
  it("paints the hero tone only when the value is known", () => {
    const { container, rerender } = render(<KpiCard label="Net worth" tone="hero" value="£1" />);
    expect(container.querySelector('[data-tone="hero"]')).not.toBeNull();
    expect(container.innerHTML).toContain("surface.hero");
    expect(container.innerHTML).toContain("text.onContrast");
    rerender(<KpiCard label="Net worth" tone="hero" value={null} />);
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    rerender(<KpiCard label="Net worth" loading tone="hero" value="£1" />);
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
  });

  it("renders a numeric value through Money with en-GB formatting", () => {
    const { container } = render(<KpiCard label="Net worth" value={1234567} />);
    expect(container.textContent).toContain("£1,234,567");
  });

  it("reads a negative numeric value as minus for screen readers", () => {
    render(<KpiCard label="Net worth" value={-1234} />);
    expect(screen.getByText("minus £1,234")).toBeDefined();
  });

  it("renders a real numeric zero as £0, not Not set", () => {
    const { container } = render(<KpiCard label="Debt" value={0} />);
    expect(container.textContent).toContain("£0");
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("supports compact valueFormat", () => {
    const { container } = render(
      <KpiCard label="Pot" value={97800} valueFormat={{ compact: true }} />,
    );
    expect(container.textContent).toContain("£97.8k");
  });
});

describe("KpiCard value size (R2-2)", () => {
  it("uses one value class for a number, a date string and a node", () => {
    const { container } = render(
      <>
        <KpiCard label="Payment" value={305} />
        <KpiCard label="Date" value="December 2029" />
        <KpiCard label="Count" value={<span>3</span>} />
      </>,
    );
    const values = [...container.querySelectorAll("[data-kpi-value]")];
    expect(values).toHaveLength(3);
    expect(new Set(values.map((v) => v.className)).size).toBe(1);
    expect(values[0]?.className).toContain("textStyle_numeric.kpi");
  });

  it("lets a long text value wrap at words, and never splits a money figure", () => {
    const { container } = render(<KpiCard label="Date" value="December 2029" />);
    expect(container.querySelector("[data-kpi-value]")?.className).toContain("ov-wrap_break-word");
    const money = render(<KpiCard label="Total" value={1234567} />).container;
    expect(money.querySelector("[data-kpi-value] > *")?.className).toContain("white-space_nowrap");
  });

  it("explains a computed figure in an InfoTip named by the label", () => {
    render(
      <KpiCard
        explain="Your saved cash divided by what you spend each month."
        label="Months of cover"
        value="7 months"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "About Months of cover" }));
    expect(screen.getByText("Your saved cash divided by what you spend each month.")).toBeDefined();
  });
});
