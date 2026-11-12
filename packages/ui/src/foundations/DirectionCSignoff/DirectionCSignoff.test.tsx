import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DirectionCSignoff } from "./DirectionCSignoff";

describe("DirectionCSignoff", () => {
  it("renders the hero with the headline figure and a Sample data label", () => {
    render(<DirectionCSignoff />);
    const hero = screen.getByTestId("signoff-hero");
    expect(within(hero).getByRole("heading", { name: "Net worth" })).toBeDefined();
    expect(within(hero).getByText("Sample data")).toBeDefined();
    expect(screen.getByTestId("signoff-hero-figure").textContent).toBe("£97,750");
  });

  it("shows four KPIs, the housekeeping coach card and no advice headings", () => {
    render(<DirectionCSignoff />);
    expect(screen.getByRole("heading", { name: "Where you stand" })).toBeDefined();
    for (const label of ["Net worth", "Monthly surplus", "Weekly safe to spend", "Liquid cash"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("region", { name: "Finish setting up" })).toBeDefined();
    expect(screen.queryByText(/What to do next/)).toBeNull();
    expect(screen.queryByText(/next best step/i)).toBeNull();
  });

  it("names the chart, hides it from assistive tech and keeps the illustration decorative", () => {
    const { container } = render(<DirectionCSignoff />);
    const figure = screen.getByRole("figure", {
      name: "Your net worth over the past year (sample data)",
    });
    expect(figure.querySelector('[aria-hidden="true"]')).not.toBeNull();
    const art = container.querySelector('[data-testid="signoff-empty-illustration"]');
    expect(art?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the five status badges and a compact accounts table with en-GB money", () => {
    render(<DirectionCSignoff />);
    for (const text of ["Paid on time", "Due in 3 days", "Overdue", "Estimate", "Not linked"]) {
      expect(screen.getByText(text)).toBeDefined();
    }
    const table = screen.getByRole("table", { name: /Sample accounts/ });
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(within(table).getByText("£61,800.00")).toBeDefined();
    expect(within(table).getByText("-£1,860.75")).toBeDefined();
  });

  it("calls onFinishSetup from the coach card button", () => {
    const onFinishSetup = vi.fn();
    render(<DirectionCSignoff onFinishSetup={onFinishSetup} />);
    fireEvent.click(screen.getByRole("button", { name: "Add missing details" }));
    expect(onFinishSetup).toHaveBeenCalledTimes(1);
  });
});
