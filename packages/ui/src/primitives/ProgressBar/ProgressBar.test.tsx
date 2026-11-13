import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar Primitive", () => {
  it("renders with proper ARIA attributes and percentage display", () => {
    render(
      <ProgressBar
        label="ISA Allowance Used"
        max={20000}
        showPercent
        value={15000}
        variant="positive"
      />,
    );

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("15000");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("20000");
    expect(bar.getAttribute("aria-valuetext")).toBe("75%");
    expect(screen.getByText("75%")).toBeDefined();
  });

  it("formats the default value text en-GB and speaks it as 'X of Y'", () => {
    render(<ProgressBar label="Emergency fund" max={12000} value={4500} />);
    expect(screen.getByText("4,500 / 12,000")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("4,500 of 12,000");
  });

  it("uses a custom valueText and valueDisplay", () => {
    render(
      <ProgressBar
        label="ISA"
        max={20000}
        value={5000}
        valueDisplay="£5,000 of £20,000"
        valueText="£5,000 of £20,000 used"
      />,
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(
      "£5,000 of £20,000 used",
    );
  });

  it("clamps out of range values and keeps the fill width in a custom property only", () => {
    const { container } = render(<ProgressBar max={100} value={250} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.getAttribute("style")).toContain("--progress-value: 100%");
    expect(container.querySelectorAll("[style]")).toHaveLength(1);
  });

  it("treats a non-positive max as 100 and a negative value as 0", () => {
    render(<ProgressBar max={0} value={-5} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });

  it("sets the fill width through --progress-value", () => {
    render(<ProgressBar max={200} value={50} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.getPropertyValue("--progress-value")).toBe("25%");
  });

  it("honours the deprecated height prop as an exact pixel height", () => {
    render(<ProgressBar height={4} value={10} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.style.getPropertyValue("--progress-height")).toBe("4px");
  });

  it("sets no height property when height is not given", () => {
    render(<ProgressBar value={10} />);
    expect(screen.getByRole("progressbar").hasAttribute("style")).toBe(false);
  });
});
