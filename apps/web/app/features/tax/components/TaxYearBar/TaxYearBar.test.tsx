import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxYearBar } from "./TaxYearBar";

describe("TaxYearBar", () => {
  it("marks the selected year as pressed and selects another", () => {
    const onSelectYear = vi.fn();
    render(
      <TaxYearBar
        years={["2025/26", "2026/27"]}
        selectedYear="2026/27"
        onSelectYear={onSelectYear}
        previousYear="2025/26"
        onCopy={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "2026/27" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "2025/26" }));
    expect(onSelectYear).toHaveBeenCalledWith("2025/26");
  });

  it("offers delete only when a handler is given", () => {
    const onDeleteYear = vi.fn();
    const onCopy = vi.fn();
    const { rerender } = render(
      <TaxYearBar
        years={["2026/27"]}
        selectedYear="2026/27"
        onSelectYear={vi.fn()}
        previousYear="2025/26"
        onCopy={onCopy}
      />,
    );
    expect(screen.queryByRole("button", { name: "Delete 2026/27" })).toBeNull();
    rerender(
      <TaxYearBar
        years={["2026/27"]}
        selectedYear="2026/27"
        onSelectYear={vi.fn()}
        previousYear="2025/26"
        onCopy={onCopy}
        onDeleteYear={onDeleteYear}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete 2026/27" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy from 2025/26" }));
    expect(onDeleteYear).toHaveBeenCalled();
    expect(onCopy).toHaveBeenCalled();
  });
});
