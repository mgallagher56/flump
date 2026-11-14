import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Section24Calculator } from "./Section24Calculator";

describe("Section24Calculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<Section24Calculator />);
    expect(container).toBeDefined();
  });

  it("updates the figures when an input changes", () => {
    render(<Section24Calculator />);
    const tool = screen.getByTestId("section-24-tool");
    const before = tool.textContent;
    fireEvent.change(document.getElementById("rental-income") as HTMLInputElement, {
      target: { value: "30000" },
    });
    expect(tool.textContent).not.toBe(before);
  });

  it("calls onSaveAndContinue from the call to action", () => {
    const onSave = vi.fn();
    render(<Section24Calculator onSaveAndContinue={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Track your properties/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("labels the rate against taxable profit, matching the engine (£4,800 of £16,000 = 30%)", () => {
    render(<Section24Calculator />);
    const text = screen.getByTestId("section-24-tool").textContent ?? "";
    expect(text).toContain("Tax as a share of taxable profit");
    expect(text).toContain("30.0%");
    expect(text).toContain("Of £16,000 taxable rental profit");
    expect(text).not.toMatch(/real cash profit/);
  });

  it("claims no automation or HMRC filing", () => {
    const { container } = render(<Section24Calculator />);
    expect(container.textContent).not.toMatch(/automat|HMRC tax due|HMRC landlord/i);
    expect(container.textContent).toContain("Flump does not file your tax return.");
  });
});
