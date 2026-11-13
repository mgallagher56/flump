import { render, screen } from "@testing-library/react";
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

  it("sizes the Not set text like a KPI value", () => {
    const { container } = render(<KpiCard label="Net worth" value={null} />);
    expect(container.innerHTML).toContain("textStyle_numeric.kpi");
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
});
