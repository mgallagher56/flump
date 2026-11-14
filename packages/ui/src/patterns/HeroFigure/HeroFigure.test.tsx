import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroFigure } from "./HeroFigure";

describe("HeroFigure", () => {
  it("draws the one hero block with the label, value and a decorative shape", () => {
    const { container } = render(<HeroFigure label="Net worth" value={241000} />);
    const group = screen.getByRole("group", { name: "Net worth" });
    expect(group.getAttribute("data-tone")).toBe("hero");
    expect(group.className).toContain("surface.hero");
    expect(group.innerHTML).toContain("text.onContrast");
    expect(container.textContent).toContain("£241,000");
    const shape = container.querySelector('[data-decorative="true"]');
    expect(shape?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
  });

  it("pairs id and data-testid, hero-figure by default, and takes an id prop", () => {
    const { rerender } = render(<HeroFigure label="Net worth" value={1} />);
    const group = screen.getByRole("group");
    expect(group.id).toBe("hero-figure");
    expect(group.dataset.testid).toBe("hero-figure");
    rerender(<HeroFigure id="debt-hero" label="Debt" value={null} />);
    expect(screen.getByRole("group").id).toBe("debt-hero");
    expect(screen.getByRole("group").dataset.testid).toBe("debt-hero");
  });

  it("fills the decorative shape with chart.primary, not primary.solid", () => {
    const { container } = render(<HeroFigure label="Net worth" value={1} />);
    const shape = container.querySelector('[data-decorative="true"]') as HTMLElement;
    expect(shape.className).toContain("bg-c_chart.primary");
    expect(shape.className).not.toContain("primary.solid");
  });

  it("sets the value in numeric.hero with tabular numerals", () => {
    const { container } = render(<HeroFigure label="Net worth" value={1234} />);
    expect(container.innerHTML).toContain("textStyle_numeric.hero");
    expect(container.innerHTML).toContain("tabular-nums");
  });

  it("reads a negative value as minus", () => {
    render(<HeroFigure label="Net worth" value={-1200} />);
    expect(screen.getByText("minus £1,200")).toBeDefined();
  });

  it("shows one delta as an arrow plus text", () => {
    const { container } = render(
      <HeroFigure
        delta={{ direction: "up", text: "+£1,240 this month" }}
        label="Net worth"
        value={1}
      />,
    );
    expect(screen.getByText("+£1,240 this month")).toBeDefined();
    expect(screen.getByText("Up")).toBeDefined();
    expect(container.innerHTML).not.toContain("status.");
  });

  it("shows a sub-line", () => {
    render(
      <HeroFigure label="Left over each month" subline="After bills and saving" value={420} />,
    );
    expect(screen.getByText("After bills and saving")).toBeDefined();
  });

  it("never carries an Estimate tag", () => {
    const { container } = render(<HeroFigure label="Net worth" value={1} />);
    expect(container.textContent).not.toMatch(/estimate/i);
  });

  it.each([null, undefined, Number.NaN, ""])(
    "falls back to a plain block with Not set and the prompt for %s",
    (value) => {
      const { container } = render(
        <HeroFigure
          emptyAction={<a href="/accounts">Add an account</a>}
          emptyPrompt="Add your accounts to see your net worth."
          label="Net worth"
          value={value}
        />,
      );
      expect(container.querySelector('[data-tone="hero"]')).toBeNull();
      expect(container.innerHTML).not.toContain("surface.hero");
      expect(container.querySelector('[data-decorative="true"]')).toBeNull();
      const notSet = screen.getByText("Not set");
      expect(notSet.className).toContain("textStyle_numeric.unset");
      expect(notSet.className).toContain("text.muted");
      expect(screen.getByText("Add your accounts to see your net worth.")).toBeDefined();
      expect(screen.getByRole("link", { name: "Add an account" })).toBeDefined();
    },
  );

  it("renders a real zero as £0 in the hero", () => {
    const { container } = render(<HeroFigure label="Net worth" value={0} />);
    expect(container.textContent).toContain("£0");
    expect(container.querySelector('[data-tone="hero"]')).not.toBeNull();
  });

  it("uses no inline styles", () => {
    const { container } = render(<HeroFigure label="Net worth" value={1} />);
    expect(container.querySelector("[style]")).toBeNull();
  });
});
